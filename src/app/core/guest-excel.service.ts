import { Injectable } from '@angular/core';
import * as ExcelJS from 'exceljs';

export interface GuestTemplateOptions {
  eventName?: string;
  groups?: string[];
  tables?: string[];
}

@Injectable({
  providedIn: 'root'
})
export class GuestExcelService {

  async generateTemplate(options: GuestTemplateOptions = {}): Promise<Blob> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Velisse Invitaciones';
    workbook.lastModifiedBy = 'Velisse Invitaciones';
    workbook.created = new Date();
    workbook.modified = new Date();

    // Hoja principal: Invitados
    const sheet = workbook.addWorksheet('Invitados', {
      views: [{ state: 'frozen', ySplit: 1 }],
      properties: { tabColor: { argb: 'FFC09C78' } }
    });

    const defaultGroups = [
      'Familia Novio',
      'Familia Novia',
      'Familiares',
      'Amigos Novio',
      'Amigos Novia',
      'Amigos',
      'Padrinos',
      'Damas de Honor',
      'Trabajo',
      'VIP',
      'General'
    ];

    const cleanCustomGroups = (options.groups || [])
      .map(g => (g || '').split('/')[0].trim())
      .filter(g => !!g);

    const groupList = Array.from(new Set([
      ...defaultGroups,
      ...cleanCustomGroups
    ]));

    const defaultTables = [
      'Mesa Principal',
      'Mesa 1',
      'Mesa 2',
      'Mesa 3',
      'Mesa 4',
      'Mesa 5',
      'Mesa VIP'
    ];

    const tableList = Array.from(new Set([
      ...(options.tables || []).filter(t => !!t?.trim()),
      ...defaultTables
    ]));

    // Definición de columnas
    sheet.columns = [
      { header: 'Nombre completo * (Obligatorio)', key: 'nombre', width: 34 },
      { header: 'Teléfono (Opcional)', key: 'telefono', width: 24 },
      { header: 'Correo electrónico (Opcional)', key: 'correo', width: 30 },
      { header: 'Grupo (Opcional - Desplegable)', key: 'grupo', width: 28 },
      { header: 'Pases extra (Opcional - Desplegable)', key: 'acompanantes', width: 28 },
      { header: 'Mesa (Opcional)', key: 'mesa', width: 24 }
    ];

    // Estilo del encabezado (Fila 1)
    const headerRow = sheet.getRow(1);
    headerRow.height = 36;

    // Colores de encabezado: Elegante Dark Espresso (#2E2621) con acentos
    const headerFill: ExcelJS.Fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF2E2621' }
    };

    const headerBorder: Partial<ExcelJS.Borders> = {
      top: { style: 'thin', color: { argb: 'FF4A3E36' } },
      bottom: { style: 'medium', color: { argb: 'FFC09C78' } }, // Acento dorado abajo
      left: { style: 'thin', color: { argb: 'FF4A3E36' } },
      right: { style: 'thin', color: { argb: 'FF4A3E36' } }
    };

    headerRow.eachCell((cell, colNumber) => {
      cell.fill = headerFill;
      cell.font = {
        name: 'Segoe UI',
        size: 11,
        bold: true,
        color: { argb: colNumber === 1 ? 'FFFFE6D0' : 'FFFFFFFF' } // El obligatorio con tono cálido destacado
      };
      cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
      cell.border = headerBorder;
    });

    // Notas de ayuda en las celdas del encabezado
    sheet.getCell('A1').note = 'OBLIGATORIO: Nombre completo del invitado titular o familia (ej: Juan Pérez o Familia López).';
    sheet.getCell('B1').note = 'OPCIONAL: WhatsApp con código de país (ej: +525512345678). Necesario para envíos por WhatsApp.';
    sheet.getCell('C1').note = 'OPCIONAL: Correo electrónico para envíos de confirmación o pases digitales.';
    sheet.getCell('D1').note = 'OPCIONAL: Selecciona un grupo del menú desplegable o escribe tu propio grupo.';
    sheet.getCell('E1').note = 'OPCIONAL: Número de personas o pases adicionales además del titular (0 a 10).';
    sheet.getCell('F1').note = 'OPCIONAL: Mesa o zona asignada (ej: Mesa 1, Mesa Principal).';

    // Fila 2 y 3: Ejemplos visuales claros
    const exampleRows = [
      {
        nombre: 'María Rodríguez',
        telefono: '+525512345678',
        correo: 'maria@ejemplo.com',
        grupo: 'Familia Novio',
        acompanantes: 1,
        mesa: tableList[0] || 'Mesa 1'
      },
      {
        nombre: 'Familia Morales Hernández',
        telefono: '+525598765432',
        correo: 'morales@ejemplo.com',
        grupo: 'Familia Novia',
        acompanantes: 3,
        mesa: tableList[1] || 'Mesa 2'
      }
    ];

    const exampleFill: ExcelJS.Fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFF9F6F0' } // Fondo crema muy suave
    };

    const thinBorder: Partial<ExcelJS.Borders> = {
      top: { style: 'thin', color: { argb: 'FFE5DCCD' } },
      bottom: { style: 'thin', color: { argb: 'FFE5DCCD' } },
      left: { style: 'thin', color: { argb: 'FFE5DCCD' } },
      right: { style: 'thin', color: { argb: 'FFE5DCCD' } }
    };

    exampleRows.forEach((data, index) => {
      const rowNum = index + 2;
      const row = sheet.addRow(data);
      row.height = 24;
      row.eachCell((cell, col) => {
        cell.fill = exampleFill;
        cell.font = { name: 'Segoe UI', size: 10, italic: true, color: { argb: 'FF7A6E65' } };
        cell.border = thinBorder;
        cell.alignment = {
          vertical: 'middle',
          horizontal: col === 1 ? 'left' : (col === 5 ? 'center' : (col === 2 ? 'center' : 'left'))
        };
      });
    });

    // Validaciones de datos y estilos para las siguientes 150 filas
    const groupFormula = `"${groupList.slice(0, 20).join(',')}"`;
    const companionsFormula = '"0,1,2,3,4,5,6,7,8,9,10"';
    const tableFormula = `"${tableList.slice(0, 20).join(',')}"`;

    for (let rowIdx = 2; rowIdx <= 150; rowIdx++) {
      const row = sheet.getRow(rowIdx);
      if (rowIdx >= 4) {
        row.height = 22;
        for (let c = 1; c <= 6; c++) {
          const cell = row.getCell(c);
          cell.font = { name: 'Segoe UI', size: 10, color: { argb: 'FF2E2621' } };
          cell.border = thinBorder;
          cell.alignment = {
            vertical: 'middle',
            horizontal: c === 1 ? 'left' : (c === 5 || c === 2 ? 'center' : 'left')
          };
        }
      }

      // Dropdown de Grupo (Columna D)
      const groupCell = row.getCell(4);
      groupCell.dataValidation = {
        type: 'list',
        allowBlank: true,
        formulae: [groupFormula],
        showErrorMessage: false,
        promptTitle: 'Grupo de invitados',
        prompt: 'Elige un grupo o escribe uno nuevo.'
      };

      // Dropdown de Acompañantes (Columna E)
      const compCell = row.getCell(5);
      compCell.dataValidation = {
        type: 'list',
        allowBlank: true,
        formulae: [companionsFormula],
        showErrorMessage: false,
        promptTitle: 'Pases adicionales',
        prompt: 'Selecciona cuántos pases extra (0 = solo el titular).'
      };

      // Dropdown de Mesa (Columna F)
      const tableCell = row.getCell(6);
      tableCell.dataValidation = {
        type: 'list',
        allowBlank: true,
        formulae: [tableFormula],
        showErrorMessage: false,
        promptTitle: 'Mesa asignada',
        prompt: 'Selecciona una mesa o escribe el nombre de la mesa.'
      };
    }

    // Hoja 2: Guía e Instrucciones
    const guideSheet = workbook.addWorksheet('Guía e Instrucciones', {
      properties: { tabColor: { argb: 'FF2E2621' } }
    });

    guideSheet.columns = [
      { width: 5 },
      { header: 'Columna', key: 'columna', width: 24 },
      { header: '¿Es obligatorio?', key: 'obligatorio', width: 20 },
      { header: 'Descripción y formato recomendado', key: 'descripcion', width: 45 },
      { header: 'Ejemplo válido', key: 'ejemplo', width: 28 }
    ];

    guideSheet.views = [{ showGridLines: true }];

    // Título de la guía
    const titleRow = guideSheet.getRow(2);
    guideSheet.mergeCells('B2:E2');
    const titleCell = guideSheet.getCell('B2');
    titleCell.value = '📋 Guía para la Importación de Invitados - Velisse';
    titleCell.font = { name: 'Segoe UI', size: 15, bold: true, color: { argb: 'FF2E2621' } };
    titleRow.height = 32;

    const subtitleRow = guideSheet.getRow(3);
    guideSheet.mergeCells('B3:E3');
    const subCell = guideSheet.getCell('B3');
    subCell.value = 'Completa la hoja "Invitados" con la información de tus asistentes y luego súbela en la plataforma.';
    subCell.font = { name: 'Segoe UI', size: 10, italic: true, color: { argb: 'FF6E6157' } };
    subtitleRow.height = 20;

    // Encabezado de la tabla de guía (Fila 5)
    const guideHeaderRow = guideSheet.getRow(5);
    guideHeaderRow.height = 28;
    ['B5', 'C5', 'D5', 'E5'].forEach((cellRef, idx) => {
      const cell = guideSheet.getCell(cellRef);
      cell.fill = headerFill;
      cell.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
      cell.border = headerBorder;
    });

    const guideData = [
      {
        col: 'Nombre completo *',
        req: 'SÍ (Obligatorio)',
        desc: 'Nombre del invitado titular o familia. Es el único campo indispensable.',
        ej: 'Mariana Fuentes / Fam. Pérez'
      },
      {
        col: 'Teléfono',
        req: 'NO (Opcional)',
        desc: 'WhatsApp con clave de país. Requerido si deseas enviar pases por WhatsApp.',
        ej: '+525512345678'
      },
      {
        col: 'Correo electrónico',
        req: 'NO (Opcional)',
        desc: 'Correo electrónico para confirmaciones o avisos digitales.',
        ej: 'contacto@gmail.com'
      },
      {
        col: 'Grupo',
        req: 'NO (Opcional)',
        desc: 'Categoría para segmentar tus invitados. Usa el desplegable o escribe otro.',
        ej: 'Familia Novia / Amigos / VIP'
      },
      {
        col: 'Pases extra',
        req: 'NO (Opcional)',
        desc: 'Número de acompañantes adicionales que pueden asistir con el titular.',
        ej: '0 (solo titular), 1, 2, 3...'
      },
      {
        col: 'Mesa',
        req: 'NO (Opcional)',
        desc: 'Nombre o número de la mesa asignada para el banquete o recepción.',
        ej: 'Mesa 1 / Mesa Principal'
      }
    ];

    guideData.forEach((item, i) => {
      const rowIdx = 6 + i;
      const r = guideSheet.getRow(rowIdx);
      r.height = 25;

      const cellB = guideSheet.getCell(`B${rowIdx}`);
      cellB.value = item.col;
      cellB.font = { name: 'Segoe UI', size: 10, bold: true };
      cellB.border = thinBorder;

      const cellC = guideSheet.getCell(`C${rowIdx}`);
      cellC.value = item.req;
      cellC.font = {
        name: 'Segoe UI',
        size: 10,
        bold: true,
        color: { argb: item.req.startsWith('SÍ') ? 'FFB91C1C' : 'FF059669' }
      };
      cellC.alignment = { horizontal: 'center' };
      cellC.border = thinBorder;

      const cellD = guideSheet.getCell(`D${rowIdx}`);
      cellD.value = item.desc;
      cellD.font = { name: 'Segoe UI', size: 10 };
      cellD.border = thinBorder;

      const cellE = guideSheet.getCell(`E${rowIdx}`);
      cellE.value = item.ej;
      cellE.font = { name: 'Segoe UI', size: 10, italic: true, color: { argb: 'FF4B5563' } };
      cellE.border = thinBorder;
    });

    // Notas finales y consejos
    const noteRow = guideSheet.getRow(13);
    guideSheet.mergeCells('B13:E13');
    const noteCell = guideSheet.getCell('B13');
    noteCell.value = '💡 Consejos importantes:';
    noteCell.font = { name: 'Segoe UI', size: 11, bold: true, color: { argb: 'FFC09C78' } };

    const tips = [
      '• Puedes dejar las filas de ejemplo o borrarlas: el sistema las detectará y omitirá automáticamente al importar.',
      '• Si solo tienes nombres, ¡puedes subirlos de inmediato! Todos los demás campos pueden completarse luego en el sistema.',
      '• Guarda el archivo y súbelo desde el botón "Importar Excel / CSV" en la sección de Invitados.'
    ];

    tips.forEach((tip, idx) => {
      const tr = guideSheet.getRow(14 + idx);
      guideSheet.mergeCells(`B${14 + idx}:E${14 + idx}`);
      const c = guideSheet.getCell(`B${14 + idx}`);
      c.value = tip;
      c.font = { name: 'Segoe UI', size: 10, color: { argb: 'FF4A3E36' } };
      tr.height = 20;
    });

    const buffer = await workbook.xlsx.writeBuffer();
    return new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });
  }

  async exportGuestsToExcel(guests: any[], eventTitle?: string): Promise<Blob> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Velisse Invitaciones';
    const sheet = workbook.addWorksheet('Invitados', {
      views: [{ state: 'frozen', ySplit: 1 }]
    });

    sheet.columns = [
      { header: 'Nombre', key: 'name', width: 28 },
      { header: 'Teléfono', key: 'phone', width: 20 },
      { header: 'Correo', key: 'email', width: 28 },
      { header: 'Grupo', key: 'group', width: 20 },
      { header: 'Pases Extra', key: 'allowedCompanions', width: 15 },
      { header: 'Mesa', key: 'tableName', width: 18 },
      { header: 'Asistencia RSVP', key: 'rsvpStatus', width: 18 },
      { header: 'Asistió (Check-in)', key: 'checkedIn', width: 18 }
    ];

    const headerRow = sheet.getRow(1);
    headerRow.height = 32;
    headerRow.eachCell((cell) => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF2E2621' }
      };
      cell.font = { name: 'Segoe UI', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
    });

    const statusTranslations: Record<string, string> = {
      confirmed: 'Confirmado',
      pending: 'Pendiente',
      declined: 'Rechazado'
    };

    guests.forEach((guest) => {
      const row = sheet.addRow({
        name: guest.name || '',
        phone: guest.phone || '',
        email: guest.email || '',
        group: guest.group || '',
        allowedCompanions: guest.allowedCompanions ?? 0,
        tableName: guest.tableName || '',
        rsvpStatus: statusTranslations[guest.rsvpStatus] || guest.rsvpStatus || 'Pendiente',
        checkedIn: guest.checkedIn ? 'Sí' : 'No'
      });

      row.height = 22;
      row.eachCell((cell, col) => {
        cell.font = { name: 'Segoe UI', size: 10 };
        cell.alignment = {
          vertical: 'middle',
          horizontal: [2, 5, 7, 8].includes(col) ? 'center' : 'left'
        };
      });
    });

    const buffer = await workbook.xlsx.writeBuffer();
    return new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });
  }

  downloadBlob(blob: Blob, filename: string): void {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }
}
