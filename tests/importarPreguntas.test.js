// Importar preguntas desde Excel o CSV (src/lib/importarPreguntas.js).
import { describe, expect, it, vi } from 'vitest';
import ExcelJS from 'exceljs';
import {
  ENCABEZADOS_PLANTILLA,
  EJEMPLOS_PLANTILLA,
  crearPlantilla,
  esEjemploPlantilla,
  leerArchivoPreguntas,
  leerClave,
  leerCsv,
  leerFilas,
  leerTipo,
} from '../src/lib/importarPreguntas.js';

const xlsxEnMemoria = async (hojas) => {
  const libro = new ExcelJS.Workbook();
  for (const [nombre, filas, preparar] of hojas) {
    const hoja = libro.addWorksheet(nombre);
    filas.forEach((f) => hoja.addRow(f));
    preparar?.(hoja);
  }
  return new Uint8Array(await libro.xlsx.writeBuffer());
};

const vacias = (n) => Array.from({ length: n }, () => '');
const filaPlantilla = (pregunta, tipo, opciones, correcta) => [pregunta, tipo, ...opciones, ...vacias(8 - opciones.length), correcta];

describe('plantilla HCE en .xlsx', () => {
  it('lee cada tipo con números y letras en la correcta', async () => {
    const datos = await xlsxEnMemoria([['Preguntas', [
      ENCABEZADOS_PLANTILLA,
      filaPlantilla('¿Capital de Francia?', 'Una correcta', ['Roma', 'París', 'Madrid'], 2),
      filaPlantilla('¿Cuáles son primos?', 'VARIAS CORRECTAS', ['2', '4', '5', '9'], 'A, C'),
      filaPlantilla('Describe la ECMO.', 'abierta', [], ''),
      filaPlantilla('Relaciona los años.', 'Emparéjar', ['1971 = Primer caso exitoso en adultos', '1972 = Publicación en NEJM'], ''),
      filaPlantilla('¿Color del cielo?', 'una correcta', ['Verde', 'Azul'], 'b'),
      filaPlantilla('¿Pares?', 'Varias correctas', ['1', '2', '3', '4'], '2 y 4'),
    ]]]);
    const { preguntas, avisos } = await leerArchivoPreguntas(datos, { nombre: 'preguntas.xlsx' });
    expect(avisos).toEqual([]);
    expect(preguntas).toEqual([
      { tipo: 'opcion', texto: '¿Capital de Francia?', opciones: ['Roma', 'París', 'Madrid'], correctas: [1] },
      { tipo: 'multiple', texto: '¿Cuáles son primos?', opciones: ['2', '4', '5', '9'], correctas: [0, 2] },
      { tipo: 'abierta', texto: 'Describe la ECMO.', opciones: [], correctas: [] },
      {
        tipo: 'emparejar', texto: 'Relaciona los años.', opciones: [], correctas: [],
        pares: [
          { izquierda: '1971', derecha: 'Primer caso exitoso en adultos' },
          { izquierda: '1972', derecha: 'Publicación en NEJM' },
        ],
      },
      { tipo: 'opcion', texto: '¿Color del cielo?', opciones: ['Verde', 'Azul'], correctas: [1] },
      { tipo: 'multiple', texto: '¿Pares?', opciones: ['1', '2', '3', '4'], correctas: [1, 3] },
    ]);
  });

  it('la plantilla generada se puede volver a leer y trae sus ejemplos e instrucciones', async () => {
    const buffer = await crearPlantilla();
    const libro = new ExcelJS.Workbook();
    await libro.xlsx.load(buffer);
    expect(libro.worksheets.map((h) => h.name)).toEqual(['Preguntas', 'Instrucciones']);
    expect(libro.getWorksheet('Preguntas').getRow(1).font.bold).toBe(true);

    const { preguntas, avisos } = await leerArchivoPreguntas(new Uint8Array(buffer), { nombre: 'plantilla-preguntas.xlsx' });
    expect(avisos).toEqual([]);
    expect(preguntas.map((p) => p.tipo)).toEqual(['opcion', 'multiple', 'abierta', 'emparejar']);
    expect(preguntas[0].correctas).toEqual([1]);
    expect(preguntas[1].correctas).toEqual([0, 1, 2]);
    expect(preguntas[3].pares.map((p) => p.izquierda)).toEqual(['1971', '1972']);
    expect(preguntas.every(esEjemploPlantilla)).toBe(true);
    expect(EJEMPLOS_PLANTILLA).toHaveLength(4);
  });

  it('una correcta con dos claves pasa a varias correctas y lo avisa', () => {
    const { preguntas, avisos } = leerFilas([
      ENCABEZADOS_PLANTILLA,
      filaPlantilla('¿Cuáles?', 'Una correcta', ['A', 'B', 'C'], '1, 3'),
    ]);
    expect(preguntas[0]).toMatchObject({ tipo: 'multiple', correctas: [0, 2] });
    expect(avisos[0]).toMatch(/^Renglón 2: dice "Una correcta"/);
  });

  it('sin tipo, lo deduce: varias claves = varias correctas; sin opciones = abierta', () => {
    const { preguntas } = leerFilas([
      ENCABEZADOS_PLANTILLA,
      filaPlantilla('Uno', '', ['x', 'y'], '1'),
      filaPlantilla('Dos', '', ['x', 'y', 'z'], 'A,C'),
      filaPlantilla('Tres', '', [], ''),
    ]);
    expect(preguntas.map((p) => p.tipo)).toEqual(['opcion', 'multiple', 'abierta']);
  });
});

describe('CSV', () => {
  const csv = [
    'Pregunta;Tipo;Opción 1;Opción 2;Opción 3;Correcta(s)',
    '"¿Qué significa ECMO; en español?";Una correcta;Oxigenación por membrana extracorpórea;Otra cosa;;1',
    '"Pregunta con ""comillas""\ny dos líneas";Varias correctas;Sí;No;Tal vez;A, C',
    'Abierta sin opciones;Abierta;;;;',
  ].join('\r\n');

  it('punto y coma, BOM, comillas y saltos de línea', async () => {
    const bytes = new TextEncoder().encode(`\uFEFF${csv}`);
    const { preguntas, avisos } = await leerArchivoPreguntas(bytes, { nombre: 'preguntas.csv' });
    expect(avisos).toEqual([]);
    expect(preguntas).toHaveLength(3);
    expect(preguntas[0]).toEqual({ tipo: 'opcion', texto: '¿Qué significa ECMO; en español?', opciones: ['Oxigenación por membrana extracorpórea', 'Otra cosa'], correctas: [0] });
    expect(preguntas[1].texto).toBe('Pregunta con "comillas"\ny dos líneas');
    expect(preguntas[1].correctas).toEqual([0, 2]);
    expect(preguntas[2].tipo).toBe('abierta');
  });

  it('separado por coma', () => {
    const filas = leerCsv('Pregunta,Tipo,Opción 1,Opción 2,Correcta(s)\n"¿Uno, o dos?",Una correcta,Uno,Dos,B\n');
    expect(filas[1]).toEqual(['¿Uno, o dos?', 'Una correcta', 'Uno', 'Dos', 'B']);
    expect(leerFilas(filas).preguntas[0].correctas).toEqual([1]);
  });

  it('CSV de Excel en Windows (no UTF-8) también se lee', async () => {
    // "Opción" en Windows-1252: ó = 0xF3
    const texto = 'Pregunta;Opción 1;Opción 2;Correcta\n¿Cuál?;Sí;No;1\n';
    const bytes = Uint8Array.from([...texto].map((c) => c.charCodeAt(0)));
    const { preguntas } = await leerArchivoPreguntas(bytes, { nombre: 'viejo.csv' });
    expect(preguntas[0]).toMatchObject({ texto: '¿Cuál?', opciones: ['Sí', 'No'], correctas: [0] });
  });
});

describe('renglones incompletos', () => {
  it('genera avisos y no truena', () => {
    const { preguntas, avisos } = leerFilas([
      ENCABEZADOS_PLANTILLA,
      filaPlantilla('Sin clave', 'Una correcta', ['a', 'b'], ''),
      filaPlantilla('', 'Una correcta', ['a', 'b'], '1'),
      filaPlantilla('Una sola opción', 'Una correcta', ['a'], '1'),
      filaPlantilla('Clave fuera de rango', 'Una correcta', ['a', 'b'], '5'),
      filaPlantilla('Tipo raro', 'Llenar huecos', ['a', 'b'], '1'),
      filaPlantilla('Tipo desconocido', 'Cosa', ['a', 'b'], '1'),
      filaPlantilla('Emparejar mal', 'Emparejar', ['solo izquierda'], ''),
      filaPlantilla('Opción sin opciones', 'Una correcta', [], ''),
    ]);
    expect(preguntas.map((p) => p.texto)).toEqual(['Sin clave', 'Clave fuera de rango', 'Tipo desconocido', 'Opción sin opciones']);
    expect(preguntas[3].tipo).toBe('abierta');
    expect(avisos).toEqual(expect.arrayContaining([
      'Renglón 2: no tiene respuesta correcta marcada; se importó sin clave.',
      'Renglón 3: tiene opciones pero no el texto de la pregunta; no se importó.',
      expect.stringMatching(/^Renglón 4: solo tiene una opción/),
      'Renglón 5: la respuesta correcta "5" no coincide con ninguna opción.',
      'Renglón 5: no tiene respuesta correcta marcada; se importó sin clave.',
      'Renglón 6: el tipo "Llenar huecos" no existe en el portal; no se importó.',
      'Renglón 7: no se reconoce el tipo "Cosa"; se tomó según sus opciones.',
      expect.stringMatching(/^Renglón 8: .*emparejar necesita al menos 2 pares/),
      'Renglón 9: dice que es de opciones pero no tiene ninguna; se importó como abierta.',
    ]));
    // Ordenados por renglón.
    const numeros = avisos.map((a) => Number(a.match(/Renglón (\d+)/)?.[1] || 0));
    expect(numeros).toEqual([...numeros].sort((a, b) => a - b));
  });

  it('archivo sin columnas reconocibles: dice qué esperaba', () => {
    const { preguntas, avisos } = leerFilas([['Nombre', 'Correo'], ['Ana', 'ana@x.com']]);
    expect(preguntas).toEqual([]);
    expect(avisos[0]).toMatch(/No se reconocieron las columnas.*"Pregunta".*"Opción 1".*"Correcta\(s\)"/);
  });

  it('archivo vacío o dañado', async () => {
    expect((await leerArchivoPreguntas(new Uint8Array(), { nombre: 'x.csv' })).avisos[0]).toMatch(/vacío/);
    expect((await leerArchivoPreguntas(new Uint8Array([0x50, 0x4b, 1, 2, 3]), { nombre: 'x.xlsx' })).avisos[0]).toMatch(/No se pudo abrir el archivo de Excel/);
    expect((await leerArchivoPreguntas(new Uint8Array([1]), { nombre: 'viejo.xls' })).avisos[0]).toMatch(/\.xlsx/);
  });
});

describe('formatos estilo TalentLMS', () => {
  it('una pregunta por renglón con "Answer N" y "Correct answer" en texto, con título arriba', async () => {
    const datos = await xlsxEnMemoria([['Test ECMO', [
      ['Test: ECMO básico'],
      [],
      ['#', 'Question', 'Question type', 'Answer 1', 'Answer 2', 'Answer 3', 'Correct answer', 'Weight'],
      [1, 'What does ECMO stand for?', 'Multiple choice', 'Extracorporeal membrane oxygenation', 'Electro cardio monitor', 'None', 'Extracorporeal membrane oxygenation', 1],
      [2, 'Select the complications', 'Multiple choice', 'Bleeding', 'Thrombosis', 'Better sleep', 'A, B', 1],
      [3, 'Explain VA ECMO', 'Free text', '', '', '', '', 1],
      [4, 'Complete the ___', 'Fill the gap', '', '', '', '', 1],
    ]]]);
    const { preguntas, avisos } = await leerArchivoPreguntas(datos, { nombre: 'talentlms.xlsx' });
    expect(preguntas).toEqual([
      { tipo: 'opcion', texto: 'What does ECMO stand for?', opciones: ['Extracorporeal membrane oxygenation', 'Electro cardio monitor', 'None'], correctas: [0] },
      { tipo: 'multiple', texto: 'Select the complications', opciones: ['Bleeding', 'Thrombosis', 'Better sleep'], correctas: [0, 1] },
      { tipo: 'abierta', texto: 'Explain VA ECMO', opciones: [], correctas: [] },
    ]);
    expect(avisos).toEqual(['Renglón 7: el tipo "Fill the gap" no existe en el portal; no se importó.']);
  });

  it('una respuesta por renglón con columna Correct (True/False)', () => {
    const { preguntas, avisos } = leerFilas([
      ['Question', 'Type', 'Answer', 'Correct'],
      ['¿Qué es la ECMO?', 'Multiple choice', 'Soporte vital extracorpóreo', 'TRUE'],
      ['', '', 'Un medicamento', 'FALSE'],
      ['', '', 'Una vacuna', 'FALSE'],
      ['¿Cuáles canulaciones existen?', 'Multiple choice', 'Venovenosa', 'Yes'],
      ['¿Cuáles canulaciones existen?', 'Multiple choice', 'Venoarterial', 'Yes'],
      ['¿Cuáles canulaciones existen?', 'Multiple choice', 'Intramuscular', 'No'],
    ]);
    expect(avisos).toEqual([]);
    expect(preguntas).toEqual([
      { tipo: 'opcion', texto: '¿Qué es la ECMO?', opciones: ['Soporte vital extracorpóreo', 'Un medicamento', 'Una vacuna'], correctas: [0] },
      { tipo: 'multiple', texto: '¿Cuáles canulaciones existen?', opciones: ['Venovenosa', 'Venoarterial', 'Intramuscular'], correctas: [0, 1] },
    ]);
  });

  it('correctas marcadas con asterisco, "(correct)", columnas Correct N y opciones en una celda', () => {
    const { preguntas } = leerFilas([
      ['Pregunta', 'Opción A', 'Opción B', 'Opción C', 'Correct 1', 'Correct 2', 'Correct 3'],
      ['Con asterisco', '*Sí', 'No', 'Tal vez', '', '', ''],
      ['Con (correct)', 'Sí', 'No (correct)', 'Tal vez', '', '', ''],
      ['Con columnas', 'Sí', 'No', 'Tal vez', 'x', '', 'x'],
    ]);
    expect(preguntas.map((p) => [p.opciones, p.correctas])).toEqual([
      [['Sí', 'No', 'Tal vez'], [0]],
      [['Sí', 'No', 'Tal vez'], [1]],
      [['Sí', 'No', 'Tal vez'], [0, 2]],
    ]);
    const enCelda = leerFilas([['Question', 'Options', 'Correct answer'], ['¿Cuál?', 'Uno\nDos*\nTres', '']]);
    expect(enCelda.preguntas[0]).toMatchObject({ opciones: ['Uno', 'Dos', 'Tres'], correctas: [1] });
  });

  it('sin encabezados: resumen con respuestas y porcentajes, y la correcta en negritas', async () => {
    const datos = await xlsxEnMemoria([['Overview', [
      ['1. ¿Qué órgano oxigena la sangre?'],
      ['Corazón', 3, '20%'],
      ['Pulmón', 12, '80%'],
      [],
      ['2. ¿Cuál es una contraindicación de ECMO?'],
      ['Sangrado activo grave', 9, '60%'],
      ['Fiebre leve', 6, '40%'],
    ], (hoja) => { hoja.getCell('A3').font = { bold: true }; hoja.getCell('A6').font = { bold: true }; }]]);
    const { preguntas, avisos } = await leerArchivoPreguntas(datos, { nombre: 'reporte.xlsx' });
    expect(preguntas).toEqual([
      { tipo: 'opcion', texto: '¿Qué órgano oxigena la sangre?', opciones: ['Corazón', 'Pulmón'], correctas: [1] },
      { tipo: 'opcion', texto: '¿Cuál es una contraindicación de ECMO?', opciones: ['Sangrado activo grave', 'Fiebre leve'], correctas: [0] },
    ]);
    expect(avisos[0]).toMatch(/no tiene encabezados/);
  });

  it('texto AIKEN (lo que acepta TalentLMS para importar)', async () => {
    const aiken = 'What is ECMO?\nA. A drug\nB. Extracorporeal support\nANSWER: B\n\nWhich is a mode?\nA) Venovenous\nB) Intravenous\nANSWER: A\n';
    const { preguntas } = await leerArchivoPreguntas(new TextEncoder().encode(aiken), { nombre: 'preguntas.txt' });
    expect(preguntas).toEqual([
      { tipo: 'opcion', texto: 'What is ECMO?', opciones: ['A drug', 'Extracorporeal support'], correctas: [1] },
      { tipo: 'opcion', texto: 'Which is a mode?', opciones: ['Venovenous', 'Intravenous'], correctas: [0] },
    ]);
  });
});

describe('encuestas', () => {
  it('ignora las correctas y no importa emparejar', () => {
    const { preguntas, avisos } = leerFilas([
      ENCABEZADOS_PLANTILLA,
      filaPlantilla('¿Te gustó?', 'Una correcta', ['Sí', 'No'], ''),
      filaPlantilla('¿Qué temas?', 'Varias correctas', ['A', 'B'], '1, 2'),
      filaPlantilla('Relaciona', 'Emparejar', ['1 = uno', '2 = dos'], ''),
    ], { esExamen: false });
    expect(preguntas).toEqual([
      { tipo: 'opcion', texto: '¿Te gustó?', opciones: ['Sí', 'No'], correctas: [] },
      { tipo: 'multiple', texto: '¿Qué temas?', opciones: ['A', 'B'], correctas: [] },
    ]);
    expect(avisos).toEqual(['Renglón 4: las encuestas no tienen preguntas de emparejar; no se importó.']);
  });
});

describe('piezas sueltas', () => {
  it('leerTipo sin acentos ni mayúsculas', () => {
    expect(leerTipo('UNA CORRECTA')).toBe('opcion');
    expect(leerTipo('Varias Correctas')).toBe('multiple');
    expect(leerTipo('ABIERTA')).toBe('abierta');
    expect(leerTipo('emparéjar')).toBe('emparejar');
    expect(leerTipo('Multiple choice')).toBe('auto');
    expect(leerTipo('Drag and drop')).toBe('emparejar');
    expect(leerTipo('Ordering')).toEqual({ noSoportado: 'Ordering' });
    expect(leerTipo('')).toBe(null);
  });

  it('leerClave entiende números, letras, texto y lo que Excel hace con "1,3"', () => {
    const op = ['uno', 'dos', 'tres', 'cuatro'];
    expect(leerClave('2', op).indices).toEqual([1]);
    expect(leerClave('B', op).indices).toEqual([1]);
    expect(leerClave('a, c', op).indices).toEqual([0, 2]);
    expect(leerClave('1 y 3', op).indices).toEqual([0, 2]);
    expect(leerClave('1.3', op).indices).toEqual([0, 2]);
    expect(leerClave('13', op).indices).toEqual([0, 2]);
    expect(leerClave('AC', op).indices).toEqual([0, 2]);
    expect(leerClave('Tres', op).indices).toEqual([2]);
    expect(leerClave('Z', op)).toEqual({ indices: [], invalidos: ['Z'] });
  });
});

describe('componente ImportarPreguntas', () => {
  const csvArchivo = () => new File([
    '\uFEFFPregunta;Tipo;Opción 1;Opción 2;Correcta(s)\n¿Uno?;Una correcta;Sí;No;1\n¿Dos?;Una correcta;Sí;No;\n(Ejemplo) Algo;Abierta;;;\n',
  ], 'preguntas.csv', { type: 'text/csv' });

  it('muestra la vista previa, deja quitar preguntas e importa las seleccionadas', async () => {
    const { render, screen, fireEvent, waitFor } = await import('@testing-library/react');
    const React = (await import('react')).default;
    const { default: ImportarPreguntas } = await import('../src/components/admin/ImportarPreguntas.jsx');
    const onImportar = vi.fn().mockRejectedValueOnce(new Error('sin conexión')).mockResolvedValue();
    render(React.createElement(ImportarPreguntas, { esExamen: true, onImportar, onCerrar: () => {} }));

    fireEvent.change(document.querySelector('input[type="file"]'), { target: { files: [csvArchivo()] } });
    await screen.findByText('¿Uno?');
    // La de ejemplo queda sin seleccionar; la de sin clave trae su aviso.
    expect(screen.getByText(/Renglón 3: no tiene respuesta correcta marcada/)).toBeTruthy();
    expect(screen.getByText(/pregunta de ejemplo de la plantilla quedó sin seleccionar/)).toBeTruthy();
    expect(screen.getByText('Correcta')).toBeTruthy();
    fireEvent.click(screen.getByLabelText('Incluir la pregunta 2'));
    const boton = screen.getByRole('button', { name: 'Importar 1 pregunta' });

    fireEvent.click(boton);
    await screen.findByText(/No se pudieron importar las preguntas: sin conexión/);
    fireEvent.click(screen.getByRole('button', { name: 'Importar 1 pregunta' }));
    await waitFor(() => expect(onImportar).toHaveBeenCalledTimes(2));
    expect(onImportar).toHaveBeenLastCalledWith([{ tipo: 'opcion', texto: '¿Uno?', opciones: ['Sí', 'No'], correctas: [0] }]);
    await screen.findByText(/se importó 1 pregunta/);
  });
});
