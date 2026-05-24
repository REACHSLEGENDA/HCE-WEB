const fs = require('fs');
const path = require('path');

const PUBLIC_PATH = path.join(__dirname, 'public');
const BASE_GALLERY_DIR = path.join(PUBLIC_PATH, 'assets', 'paginas', 'galerias HCE');
const OUTPUT_FILE = path.join(__dirname, 'src', 'data', 'galleryData.json');

// Ensure output directory exists
const outputDir = path.dirname(OUTPUT_FILE);
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Function to scan an image folder and return web paths
const scanFolder = (subpath) => {
  const targetDir = path.join(BASE_GALLERY_DIR, subpath);
  if (!fs.existsSync(targetDir)) {
    console.warn(`Warning: Folder does not exist at ${targetDir}`);
    return [];
  }
  
  const files = fs.readdirSync(targetDir);
  return files
    .filter(file => {
      const ext = path.extname(file).toLowerCase();
      return ext === '.jpg' || ext === '.jpeg' || ext === '.png' || ext === '.webp';
    })
    .map(file => {
      const relativePath = path.join('assets', 'paginas', 'galerias HCE', subpath, file)
        .replace(/\\/g, '/');
      return '/' + relativePath;
    });
};

const result = [
  {
    id: 'cdmx-inc-2024',
    title: 'Diploma CDMX INC (Septiembre 2024)',
    shortTitle: 'CDMX INC 2024',
    description: 'Diploma de la experiencia práctica de simulación en el Instituto Nacional de Cardiología Ignacio Chávez (INC).',
    hasSubfolders: false,
    images: scanFolder('1. GALERIA DIPLOMA CDMX INC SEPTIEMBRE 2024')
  },
  {
    id: 'cdmx-iner-2025',
    title: 'CDMX INER (Marzo 2025)',
    shortTitle: 'CDMX INER 2025',
    description: 'Sesión intensiva de simulación práctica clínica y entrega de diplomas en el Instituto Nacional de Enfermedades Respiratorias (INER).',
    hasSubfolders: true,
    subfolders: {
      diploma: {
        title: 'Diploma',
        description: 'Fotografías del diploma de la experiencia clínica en el INER.',
        images: scanFolder('2. GALERIA CDMX INER MARZO 2025/Diploma')
      },
      simulacion: {
        title: 'Simulación',
        description: 'Taller práctico interactivo y bootcamps de simulación en el INER.',
        images: scanFolder('2. GALERIA CDMX INER MARZO 2025/simulacion')
      }
    }
  },
  {
    id: 'ecuador-2024',
    title: 'ECMO Nursing Guayaquil (Agosto 2024)',
    shortTitle: 'Guayaquil 2024',
    description: 'Taller práctico intensivo de ECMO Nursing Care y simulación clínica en Guayaquil, Ecuador.',
    hasSubfolders: false,
    images: scanFolder('3. GALERIA ECMO NURSING GUAYAQUIL AGOSTO 2024')
  },
  {
    id: 'santiago-chile-2025',
    title: 'Santiago de Chile (Octubre 2025)',
    shortTitle: 'Chile 2025',
    description: 'Experiencia y simulación avanzada de ECMO Sim en Santiago de Chile.',
    hasSubfolders: false,
    images: scanFolder('4. GALERIA SANTIAGO DE CHILE OCTUBRE 2025')
  }
];

// Enrich counts and cover images
result.forEach(g => {
  if (g.hasSubfolders) {
    g.imagesCount = g.subfolders.diploma.images.length + g.subfolders.simulacion.images.length;
    g.coverImage = g.subfolders.diploma.images[0] || g.subfolders.simulacion.images[0] || '';
  } else {
    g.imagesCount = g.images.length;
    g.coverImage = g.images[0] || '';
  }
  console.log(`Processed: ${g.title} (${g.imagesCount} images total)`);
});

fs.writeFileSync(OUTPUT_FILE, JSON.stringify(result, null, 2), 'utf-8');
console.log(`Successfully generated restructured nested gallery data at: ${OUTPUT_FILE}`);
