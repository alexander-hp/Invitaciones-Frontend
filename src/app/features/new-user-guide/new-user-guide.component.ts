import { Component, Input } from '@angular/core';

interface GuideSection {
  id: string;
  title: string;
  icon: string;
  description: string;
  steps: { title: string; text: string }[];
}

@Component({
  selector: 'app-new-user-guide',
  templateUrl: './new-user-guide.component.html'
})
export class NewUserGuideComponent {
  @Input() embedded = false;
  sidebarOpen = false;
  activeSection = 'dashboard';

  sections: GuideSection[] = [
    {
      id: 'dashboard',
      title: 'Dashboard',
      icon: `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/></svg>`,
      description: 'El Dashboard es tu centro de control. Desde aquí puedes ver de un vistazo el estado de todos tus eventos e invitaciones.',
      steps: [
        { title: 'Métricas generales', text: 'En la parte superior verás tarjetas con el total de eventos, invitaciones enviadas, confirmaciones, declinaciones y pendientes.' },
        { title: 'Tasa de confirmación', text: 'La barra de progreso circular muestra qué porcentaje de tus invitados ya confirmaron asistencia.' },
        { title: 'Envíos y apertura', text: 'Consulta cuántos mensajes se enviaron por WhatsApp o correo, cuántos se abrieron y si hubo errores.' },
        { title: 'Mis eventos', text: 'Debajo de las métricas aparecen tus eventos más recientes con su fecha, tipo y un botón para acceder directamente.' }
      ]
    },
    {
      id: 'eventos',
      title: 'Eventos',
      icon: `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`,
      description: 'La sección de Eventos es donde gestionas cada celebración. Puedes tener múltiples eventos activos al mismo tiempo.',
      steps: [
        { title: 'Crear un evento', text: 'Haz clic en "Nuevo evento", elige el tipo (Boda, XV Años, Graduación, etc.), agrega título, fecha y lugar.' },
        { title: 'Ver el evento', text: 'Al hacer clic en una tarjeta de evento, accedes al detalle completo con todas sus pestañas.' },
        { title: 'Tipos de evento', text: 'Puedes crear eventos de tipo Boda, XV Años, Cumpleaños, Graduación, Bautizo y más.' },
        { title: 'Gestión múltiple', text: 'Desde la lista puedes buscar, filtrar y acceder rápidamente a cualquiera de tus eventos.' }
      ]
    },
    {
      id: 'plan',
      title: 'Plan y Facturación',
      icon: `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>`,
      description: 'Consulta tu plan actual, los límites de tu suscripción y el historial de pagos.',
      steps: [
        { title: 'Plan activo', text: 'Ve qué plan tienes contratado, su nombre y los límites: número de eventos, invitados, álbum, etc.' },
        { title: 'Estado de suscripción', text: 'Revisa si tu suscripción está activa y cuándo vence el periodo actual.' },
        { title: 'Límites de uso', text: 'Barras de progreso te muestran cuánto estás usando de cada límite: invitados, eventos, imágenes.' },
        { title: 'Historial de pagos', text: 'Consulta todos tus pagos anteriores, fecha, monto y estado de cada uno.' }
      ]
    },
    {
      id: 'contacto',
      title: 'Contacto',
      icon: `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>`,
      description: 'Envía un mensaje directo a nuestro equipo de soporte para resolver cualquier duda o problema.',
      steps: [
        { title: 'Formulario de contacto', text: 'Completa el formulario con tu nombre, correo, asunto y mensaje. Nuestro equipo te responderá en menos de 24 horas.' },
        { title: 'Soporte prioritario', text: 'Si tienes un plan premium, tu solicitud se atiende con prioridad máxima.' }
      ]
    },
    {
      id: 'informacion',
      title: 'Información del Evento',
      icon: `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`,
      description: 'La pestaña Información dentro de un evento contiene los datos generales y los portales de acceso externo.',
      steps: [
        { title: 'Datos del evento', text: 'Aquí puedes ver y editar el título, tipo, fecha, lugar y descripción del evento.' },
        { title: 'Portal externo', text: 'Genera un enlace público para que tu fotógrafo, DJ u otros proveedores accedan a sus funciones específicas.' },
        { title: 'Código QR', text: 'Descarga el código QR del evento para colocarlo en tu invitación física y facilitar el check-in.' }
      ]
    },
    {
      id: 'invitados',
      title: 'Invitados (Guests)',
      icon: `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
      description: 'Administra tu lista de invitados: agrégalos manualmente o importa desde Excel, asígnalos a mesas y envíales su invitación.',
      steps: [
        { title: 'Agregar invitado', text: 'Haz clic en "Agregar invitado" e ingresa nombre, teléfono o correo, y el número de acompañantes permitidos.' },
        { title: 'Importar desde Excel', text: 'Usa el botón de importación para subir un archivo CSV/Excel con todos tus invitados en un solo paso.' },
        { title: 'Buscar y filtrar', text: 'Filtra invitados por nombre, estado de RSVP (confirmado, pendiente, declinado) o por mesa asignada.' },
        { title: 'Acciones individuales', text: 'Desde cada invitado puedes editar sus datos, ver su RSVP, eliminarlo o reenviar su invitación.' }
      ]
    },
    {
      id: 'mesas',
      title: 'Mesas (Seating)',
      icon: `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M12 2v4M12 18v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M2 12h4M18 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"/></svg>`,
      description: 'Organiza a tus invitados en mesas con el editor visual de distribución.',
      steps: [
        { title: 'Crear mesa', text: 'Haz clic en "Nueva mesa", ponle un nombre (Ej: Mesa 1, Familia García) y define el número de sillas.' },
        { title: 'Asignar invitados', text: 'Arrastra y suelta invitados desde la lista al asiento de la mesa, o selecciónalos desde el panel lateral.' },
        { title: 'Vista del plano', text: 'Activa la vista de plano para ver la distribución visual del salón y mover mesas de lugar.' },
        { title: 'Exportar', text: 'Exporta el plan de mesas en PDF para imprimirlo o compartirlo con el salón.' }
      ]
    },
    {
      id: 'rsvp',
      title: 'RSVP',
      icon: `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`,
      description: 'Consulta y gestiona las respuestas de confirmación de tus invitados.',
      steps: [
        { title: 'Lista de respuestas', text: 'Ve quién confirmó, quién declinó y quién aún no ha respondido su invitación.' },
        { title: 'Filtrar por estado', text: 'Filtra por "Confirmado", "Declinado" o "Pendiente" para gestionar cada grupo por separado.' },
        { title: 'Editar RSVP', text: 'Puedes marcar manualmente el RSVP de un invitado si te confirmó por otro medio (llamada, mensaje, etc.).' },
        { title: 'Acompañantes', text: 'Cada RSVP puede incluir el número de acompañantes que el invitado trae consigo.' }
      ]
    },
    {
      id: 'album',
      title: 'Álbum de Fotos',
      icon: `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>`,
      description: 'El álbum permite a tus invitados subir y ver fotos del evento desde su portal.',
      steps: [
        { title: 'Galería del evento', text: 'Todas las fotos subidas por invitados aparecen aquí en una galería bonita y ordenada.' },
        { title: 'Subir fotos', text: 'Como organizador puedes subir fotos directamente desde esta pestaña.' },
        { title: 'Moderar contenido', text: 'Puedes eliminar cualquier foto que no sea apropiada desde el panel de administración.' },
        { title: 'Compartir álbum', text: 'Genera un enlace del álbum para compartirlo después del evento con todos los asistentes.' }
      ]
    },
    {
      id: 'comunicacion',
      title: 'Comunicación',
      icon: `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>`,
      description: 'Envía tu invitación digital a todos tus invitados por WhatsApp o correo electrónico.',
      steps: [
        { title: 'Seleccionar invitados', text: 'Elige a quién enviar: todos los invitados, solo pendientes, o una selección manual.' },
        { title: 'Canal de envío', text: 'Selecciona si enviar por WhatsApp, correo electrónico o ambos canales simultáneamente.' },
        { title: 'Vista previa del mensaje', text: 'Antes de enviar puedes revisar exactamente cómo recibirán el mensaje tus invitados.' },
        { title: 'Seguimiento de envíos', text: 'Después del envío, consulta estadísticas de entregas, aperturas y errores en tiempo real.' }
      ]
    },
    {
      id: 'dj',
      title: 'DJ / Peticiones',
      icon: `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="2"/><path d="M4.93 4.93l4.24 4.24"/><path d="M14.83 9.17l4.24-4.24"/><path d="M14.83 14.83l4.24 4.24"/><path d="M9.17 14.83l-4.24 4.24"/><circle cx="12" cy="12" r="8"/></svg>`,
      description: 'El módulo DJ permite que tus invitados envíen peticiones musicales en tiempo real durante el evento.',
      steps: [
        { title: 'Activar módulo DJ', text: 'Habilita el módulo desde la configuración del evento para que aparezca en la invitación de tus invitados.' },
        { title: 'Peticiones en vivo', text: 'Los invitados pueden escribir la canción que desean y el DJ la ve en su panel en tiempo real.' },
        { title: 'Panel del DJ', text: 'Comparte el enlace del portal DJ con tu animador para que gestione y apruebe las peticiones.' },
        { title: 'Historial', text: 'Consulta todas las canciones solicitadas durante el evento para recordar el ambiente musical.' }
      ]
    },
    {
      id: 'dedicatorias',
      title: 'Dedicatorias',
      icon: `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>`,
      description: 'Los invitados pueden enviar mensajes y dedicatorias especiales a los festejados directamente desde su invitación.',
      steps: [
        { title: 'Ver dedicatorias', text: 'Todas las dedicatorias enviadas por tus invitados aparecen aquí ordenadas por fecha.' },
        { title: 'Moderar mensajes', text: 'Puedes eliminar cualquier dedicatoria que no sea apropiada antes de que sea visible.' },
        { title: 'Exportar', text: 'Descarga todas las dedicatorias en PDF para conservarlas como recuerdo del evento.' },
        { title: 'Notificaciones', text: 'Recibe una notificación cuando un nuevo mensaje llega durante tu evento.' }
      ]
    },
    {
      id: 'usuarios',
      title: 'Cómo Agregar Usuarios',
      icon: `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg>`,
      description: 'Puedes invitar a colaboradores (coordinadores, fotógrafos, etc.) para que accedan a funciones específicas de tu evento.',
      steps: [
        { title: 'Invitar colaborador', text: 'Desde la pestaña Información de un evento, busca la sección "Miembros" y haz clic en "Invitar usuario".' },
        { title: 'Correo de invitación', text: 'Ingresa el correo de la persona. Recibirán un enlace para crear su cuenta y acceder al evento.' },
        { title: 'Roles y permisos', text: 'Asigna el rol adecuado: Administrador (acceso total), Coordinador, Fotógrafo, Solo lectura.' },
        { title: 'Gestionar accesos', text: 'En cualquier momento puedes revocar el acceso de un colaborador desde la misma sección de miembros.' }
      ]
    },
    {
      id: 'invitacion',
      title: 'Crear la Invitación',
      icon: `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>`,
      description: 'Diseña tu invitación digital con el editor visual: elige plantilla, colores, tipografía, portadas y más.',
      steps: [
        { title: 'Acceder al editor', text: 'Desde la lista de eventos, haz clic en "Editar invitación" junto al evento deseado.' },
        { title: 'Elegir plantilla', text: 'Selecciona entre nuestras plantillas premium: Sobre y tarjetas, Clásica elegante y más.' },
        { title: 'Personalizar contenido', text: 'Edita textos, sube tu foto de portada, añade el itinerario del evento y las ubicaciones.' },
        { title: 'Configurar RSVP', text: 'Define si permites acompañantes, cuántos, y hasta qué fecha pueden confirmar.' },
        { title: 'Sección de regalos', text: 'Agrega números de cuenta bancaria o mesa de regalos para que tus invitados sepan cómo obsequiarte.' },
        { title: 'Vista previa y publicar', text: 'Usa "Vista previa" para ver exactamente cómo verán la invitación tus invitados, luego guarda los cambios.' }
      ]
    },
    {
      id: 'historial',
      title: 'Historial de Cambios',
      icon: `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="12 8 12 12 14 14"/><path d="M3.05 11a9 9 0 1 1 .5 4m-.5 5v-5h5"/></svg>`,
      description: 'El Historial de Cambios registra en tiempo real toda la actividad, confirmaciones y modificaciones de tu evento.',
      steps: [
        { title: 'Auditoría en tiempo real', text: 'Consulta cada confirmación RSVP, modificación de invitados, cambios de mesas y actualizaciones del evento.' },
        { title: 'Filtro por categoría', text: 'Filtra la actividad por categoría: Invitados, RSVPs, Mesas, Check-in, Mensajes, Fotos, DJ, Dedicatorias y Ajustes.' },
        { title: 'Búsqueda rápida', text: 'Busca un evento o acción específica ingresando el nombre del invitado o la acción en la barra de búsqueda.' },
        { title: 'Detalles expandibles', text: 'Haz clic en cualquier registro para desplegar los detalles técnicos exactos de los cambios realizados.' }
      ]
    }
  ];

  get activeGuide(): GuideSection | undefined {
    return this.sections.find(s => s.id === this.activeSection);
  }

  setActive(id: string): void {
    this.activeSection = id;
  }
}
