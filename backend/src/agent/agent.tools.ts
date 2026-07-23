import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { LeadsService } from '../leads/leads.service';
import { AppointmentsService } from '../appointments/appointments.service';
import { ConfigService } from '../config/config.service';

/**
 * Dependencies the tools need. The tools are THIN wrappers: all business logic
 * lives in the Nest services below.
 */
export interface AgentToolDeps {
  leads: LeadsService;
  appointments: AppointmentsService;
  config: ConfigService;
}

/** Reads the current lead id from the runtime context set per request. */
function getLeadId(runtimeContext: any): string | null {
  try {
    return runtimeContext?.get?.('leadId') ?? null;
  } catch {
    return null;
  }
}

/**
 * Builds the toolset the agent uses to manage demos/meetings. Every tool
 * delegates to a Nest service — no domain logic here.
 */
export function buildAgentTools(deps: AgentToolDeps) {
  const listMeetingTypes = createTool({
    id: 'list_meeting_types',
    description:
      'Lista los tipos de reunión/demo disponibles con su duración. Úsalo para saber qué puedes ofrecer.',
    inputSchema: z.object({}),
    execute: async () => {
      const types = await deps.config.getMeetingTypes(true);
      return {
        meetingTypes: types.map((t) => ({
          name: t.name,
          durationMinutes: t.durationMinutes,
        })),
      };
    },
  });

  const checkAvailability = createTool({
    id: 'check_availability',
    description:
      'Consulta los huecos libres para un tipo de reunión en una fecha concreta (formato YYYY-MM-DD).',
    inputSchema: z.object({
      date: z.string().describe('Fecha en formato YYYY-MM-DD'),
      meetingType: z.string().describe('Nombre exacto del tipo de reunión'),
    }),
    execute: async ({ context }) => {
      const slots = await deps.appointments.getAvailability(
        context.date,
        context.meetingType,
      );
      return {
        date: context.date,
        meetingType: context.meetingType,
        availableSlots: slots.map((s) => ({ startsAt: s.startsAt, time: s.label })),
      };
    },
  });

  const bookAppointment = createTool({
    id: 'book_appointment',
    description:
      'Reserva una reunión/demo para el contacto actual. Usa un startsAt (ISO 8601) que provenga de check_availability.',
    inputSchema: z.object({
      meetingType: z.string(),
      startsAt: z.string().describe('Inicio en formato ISO 8601'),
      notes: z.string().optional(),
    }),
    execute: async ({ context, runtimeContext }) => {
      const leadId = getLeadId(runtimeContext);
      if (!leadId) {
        return { ok: false, error: 'No hay un contacto asociado a esta conversación.' };
      }
      const appointment = await deps.appointments.create(
        {
          leadId,
          meetingTypeName: context.meetingType,
          startsAt: context.startsAt,
          notes: context.notes,
        },
        'agent',
      );
      return {
        ok: true,
        appointmentId: appointment.id,
        meetingType: appointment.meetingTypeName,
        startsAt: appointment.startsAt,
      };
    },
  });

  const listMyAppointments = createTool({
    id: 'list_my_appointments',
    description: 'Lista las reuniones/demos del contacto actual (para consultarlas o cancelarlas).',
    inputSchema: z.object({}),
    execute: async ({ runtimeContext }) => {
      const leadId = getLeadId(runtimeContext);
      if (!leadId) return { appointments: [] };
      const items = await deps.appointments.findForLead(leadId);
      return {
        appointments: items
          .filter((a) => a.status !== 'cancelled')
          .map((a) => ({
            id: a.id,
            meetingType: a.meetingTypeName,
            startsAt: a.startsAt,
            status: a.status,
          })),
      };
    },
  });

  const cancelAppointment = createTool({
    id: 'cancel_appointment',
    description:
      'Cancela una reunión/demo por su id. Primero usa list_my_appointments para obtener el id.',
    inputSchema: z.object({ appointmentId: z.string() }),
    execute: async ({ context, runtimeContext }) => {
      const leadId = getLeadId(runtimeContext);
      const appt = await deps.appointments.findOne(context.appointmentId);
      // Guard: only allow cancelling the current lead's own appointments.
      if (!leadId || appt.leadId !== leadId) {
        return { ok: false, error: 'Esa reunión no pertenece a este contacto.' };
      }
      await deps.appointments.cancel(context.appointmentId);
      return { ok: true };
    },
  });

  const updateLeadInfo = createTool({
    id: 'update_lead_info',
    description:
      'Guarda datos del contacto actual que menciona en la conversación (nombre, email, empresa, producto de interés).',
    inputSchema: z.object({
      name: z.string().optional(),
      email: z.string().optional(),
      company: z.string().optional(),
      interest: z.string().optional(),
    }),
    execute: async ({ context, runtimeContext }) => {
      const leadId = getLeadId(runtimeContext);
      if (!leadId) return { ok: false };
      await deps.leads.update(leadId, context);
      return { ok: true };
    },
  });

  return {
    list_meeting_types: listMeetingTypes,
    check_availability: checkAvailability,
    book_appointment: bookAppointment,
    list_my_appointments: listMyAppointments,
    cancel_appointment: cancelAppointment,
    update_lead_info: updateLeadInfo,
  };
}
