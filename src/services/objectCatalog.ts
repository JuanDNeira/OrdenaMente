/**
 * objectCatalog.ts — Catálogo de objetos del hogar en español.
 *
 * El modelo MobileNet V3 solo conoce las 1000 clases de ImageNet (en inglés),
 * muchas irrelevantes para un inventario doméstico (peces, perros, volcanes…)
 * y sin clases para objetos tan comunes como tenedor o cargador.
 *
 * Este catálogo resuelve tres cosas:
 *   1. TRADUCCIÓN: cada clase relevante tiene su nombre en español. Lo que no
 *      está aquí se DESCARTA; nunca se muestra una etiqueta en inglés.
 *   2. AGRUPACIÓN: una clase puede apuntar a varios conceptos
 *      (principal, secundario, terciario). Ej.: "cleaver", "letter opener" y
 *      "hatchet" suman evidencia a "Cuchillo". Así, etiquetas parecidas dejan
 *      de competir entre sí y refuerzan el concepto correcto.
 *   3. ACCIÓN ECO: cada concepto tiene una acción sugerida (por defecto, reuse).
 *
 * Formato de cada línea:  clase_imagenet > Principal > Secundario > Terciario
 */

import type { EcoAction } from '../types/Item';

/** Peso con el que cada posición suma evidencia a su concepto. */
export const CONCEPT_WEIGHTS = [1, 0.6, 0.35] as const;

const RAW_CATALOG = `
ladle > Cucharón > Cuchara > Cubiertos
wooden spoon > Cuchara de madera > Cuchara > Utensilio de cocina
spatula > Espátula > Utensilio de cocina > Cuchara
cleaver > Cuchillo > Utensilio de cocina
letter opener > Abrecartas > Cuchillo > Cubiertos
hatchet > Hacha > Cuchillo
scabbard > Funda > Cuchillo
can opener > Abrelatas > Utensilio de cocina > Cubiertos
corkscrew > Sacacorchos > Utensilio de cocina > Cubiertos
hook > Gancho > Cubiertos > Utensilio de cocina
strainer > Colador > Utensilio de cocina
plate > Plato
soup bowl > Tazón > Plato
mixing bowl > Tazón
pitcher > Jarra
water jug > Jarra
whiskey jug > Jarra
vase > Florero
cup > Taza
coffee mug > Taza > Vaso
goblet > Copa > Vaso
beer glass > Vaso > Copa
beaker > Vaso
measuring cup > Taza medidora > Taza
cocktail shaker > Coctelera > Termo
teapot > Tetera
coffeepot > Cafetera > Tetera
espresso maker > Cafetera
frying pan > Sartén
wok > Sartén > Olla
caldron > Olla
Crock Pot > Olla
Dutch oven > Olla
pot > Maceta
tray > Bandeja
plate rack > Escurreplatos
dishrag > Paño de cocina
paper towel > Papel de cocina
saltshaker > Salero
milk can > Lata
water bottle > Botella de agua > Termo > Botella
pop bottle > Botella
beer bottle > Botella de vidrio > Botella
wine bottle > Botella de vidrio > Botella
pill bottle > Frasco de medicinas > Frasco
perfume > Perfume > Frasco
lotion > Crema > Frasco
sunscreen > Protector solar > Crema
hair spray > Aerosol > Frasco
soap dispenser > Dispensador de jabón > Frasco
bottlecap > Tapa
packet > Paquete > Envase
carton > Caja de cartón > Envase
crate > Caja
chest > Baúl > Caja
envelope > Sobre
binder > Carpeta
notebook > Laptop > Cuaderno
comic book > Libro > Revista
book jacket > Libro
menu > Papel
crossword puzzle > Papel
plastic bag > Bolsa de plástico
shopping basket > Canasta
hamper > Canasta
barrel > Barril
bucket > Balde
ashcan > Bote de basura
rain barrel > Barril
tub > Tina > Balde
washbasin > Lavamanos
bathtub > Bañera
toilet seat > Asiento de inodoro
toilet tissue > Papel higiénico
bath towel > Toalla
doormat > Tapete
prayer rug > Tapete
quilt > Cobija
pillow > Almohada
sleeping bag > Bolsa de dormir
shower curtain > Cortina de baño
window shade > Persiana
mosquito net > Mosquitero
velvet > Tela
wool > Tela
umbrella > Paraguas
broom > Escoba
plunger > Destapador
swab > Hisopo > Trapeador
mousetrap > Trampa para ratones
bookcase > Estantería
wardrobe > Armario
chiffonier > Cómoda
china cabinet > Vitrina
desk > Escritorio
dining table > Mesa
folding chair > Silla
rocking chair > Silla mecedora > Silla
barber chair > Silla
throne > Silla
studio couch > Sofá
park bench > Banca
four-poster > Cama
crib > Cuna
bassinet > Cuna
cradle > Cuna
entertainment center > Mueble de TV
pedestal > Pedestal
file > Archivador
table lamp > Lámpara
lampshade > Lámpara
spotlight > Lámpara
torch > Linterna
candle > Vela
lighter > Encendedor
matchstick > Fósforos
wall clock > Reloj de pared
analog clock > Reloj de pared > Reloj
digital clock > Reloj despertador > Reloj
digital watch > Reloj de pulsera > Reloj
stopwatch > Cronómetro > Reloj
hourglass > Reloj de arena
barometer > Barómetro
magnetic compass > Brújula
scale > Báscula
binoculars > Binoculares
loupe > Lupa
lens cap > Tapa de lente
reflex camera > Cámara
Polaroid camera > Cámara
projector > Proyector
monitor > Monitor > Pantalla
screen > Pantalla > Monitor
television > Televisor > Pantalla
laptop > Laptop
desktop computer > Computadora
computer keyboard > Teclado
typewriter keyboard > Teclado
space bar > Teclado
mouse > Ratón
joystick > Control de videojuegos
modem > Módem > Cargador > Accesorio electrónico
printer > Impresora
photocopier > Impresora
hard disc > Disco duro
cassette > Casete
cassette player > Reproductor de música > Accesorio electrónico
CD player > Reproductor de música > Accesorio electrónico
tape player > Reproductor de música > Accesorio electrónico
radio > Radio
loudspeaker > Parlante
microphone > Micrófono
iPod > Reproductor de música > Accesorio electrónico
remote control > Control remoto > Accesorio electrónico
cellular telephone > Teléfono móvil
hand-held computer > Teléfono móvil > Tablet
dial telephone > Teléfono fijo
pay-phone > Teléfono fijo
switch > Interruptor > Cargador > Accesorio electrónico
electric fan > Ventilador
space heater > Calefactor
radiator > Calefactor
iron > Plancha
vacuum > Aspiradora
washer > Lavadora
dishwasher > Lavavajillas
refrigerator > Nevera
microwave > Microondas
stove > Estufa
toaster > Tostadora
waffle iron > Wafflera
rotisserie > Asador
sewing machine > Máquina de coser
spindle > Carrete > Hilo
reel > Carrete
thimble > Dedal
safety pin > Alfiler de seguridad > Alfiler
nail > Clavo
screw > Tornillo
screwdriver > Destornillador > Herramienta
hammer > Martillo > Herramienta
plane > Cepillo de carpintero > Herramienta
power drill > Taladro > Herramienta
chain saw > Motosierra > Herramienta
shovel > Pala > Herramienta
paintbrush > Brocha
padlock > Candado
combination lock > Candado
safe > Caja fuerte
chain > Cadena
knot > Cuerda
stethoscope > Estetoscopio
syringe > Jeringa
Band Aid > Curita
medicine chest > Botiquín
ballpoint > Bolígrafo
fountain pen > Pluma
quill > Pluma
pencil box > Cartuchera
pencil sharpener > Sacapuntas
rubber eraser > Borrador
rule > Regla
pick > Púa de guitarra
lipstick > Labial > Maquillaje
face powder > Maquillaje
jean > Jean > Pantalón
jersey > Camiseta > Ropa
sweatshirt > Buzo > Ropa
cardigan > Suéter > Ropa
suit > Traje > Ropa
trench coat > Abrigo > Chaqueta
fur coat > Abrigo
poncho > Poncho > Ruana
lab coat > Bata > Ropa
kimono > Bata > Ropa
gown > Vestido > Ropa
miniskirt > Falda > Ropa
overskirt > Falda > Ropa
sarong > Falda > Ropa
pajama > Pijama > Ropa
bikini > Traje de baño
maillot > Traje de baño
swimming trunks > Traje de baño
brassiere > Ropa interior
diaper > Pañal
sock > Medias
mitten > Guantes
stole > Bufanda
feather boa > Bufanda
bow tie > Corbata
Windsor tie > Corbata
bolo tie > Corbata
bonnet > Gorro
cowboy hat > Sombrero
sombrero > Sombrero
shower cap > Gorro
bathing cap > Gorro
ski mask > Pasamontañas
wig > Peluca
sunglasses > Gafas de sol
sunglass > Gafas de sol
sandal > Sandalias > Zapatos
clog > Zuecos > Zapatos
Loafer > Zapatos
running shoe > Tenis > Zapatos
cowboy boot > Botas > Zapatos
wallet > Billetera
purse > Bolso
backpack > Mochila
mailbag > Bolso
necklace > Collar > Joyería
buckle > Hebilla
hair slide > Accesorio de cabello
apron > Delantal
bib > Babero
handkerchief > Pañuelo
teddy > Peluche > Juguete
jigsaw puzzle > Rompecabezas > Juguete
pinwheel > Molinillo de juguete > Juguete
balloon > Globo
baseball > Pelota > Balón
basketball > Balón de baloncesto > Balón
soccer ball > Balón de fútbol > Balón
tennis ball > Pelota de tenis > Pelota
volleyball > Balón de voleibol > Balón
rugby ball > Balón
golf ball > Pelota de golf > Pelota
ping-pong ball > Pelota de ping-pong > Pelota
croquet ball > Pelota
racket > Raqueta
dumbbell > Mancuerna
barbell > Pesa
punching bag > Saco de boxeo
ski > Esquí
snorkel > Snorkel
mask > Máscara
crash helmet > Casco
football helmet > Casco
piggy bank > Alcancía
acoustic guitar > Guitarra > Instrumento musical
electric guitar > Guitarra > Instrumento musical
banjo > Banjo > Instrumento musical
violin > Violín > Instrumento musical
cello > Violonchelo > Instrumento musical
harp > Arpa > Instrumento musical
flute > Flauta > Instrumento musical
oboe > Oboe > Instrumento musical
bassoon > Fagot > Instrumento musical
sax > Saxofón > Instrumento musical
harmonica > Armónica > Instrumento musical
accordion > Acordeón > Instrumento musical
drum > Tambor > Instrumento musical
drumstick > Baquetas > Instrumento musical
maraca > Maracas > Instrumento musical
marimba > Marimba > Instrumento musical
ocarina > Ocarina > Instrumento musical
panpipe > Flauta de pan > Instrumento musical
whistle > Silbato
gong > Gong > Instrumento musical
trombone > Trombón > Instrumento musical
French horn > Corno > Instrumento musical
cornet > Trompeta > Instrumento musical
grand piano > Piano > Instrumento musical
upright > Piano > Instrumento musical
organ > Órgano > Instrumento musical
steel drum > Tambor > Instrumento musical
mountain bike > Bicicleta
bicycle-built-for-two > Bicicleta
unicycle > Monociclo
tricycle > Triciclo
moped > Moto
motor scooter > Moto
`;

// ─── Acción ecológica por concepto ────────────────────────────────────────────
// Todo concepto que no aparezca aquí usa 'reuse' por defecto.

const ECO_BY_ACTION: Record<Exclude<EcoAction, 'reuse'>, string[]> = {
  recycle: [
    'Botella', 'Botella de vidrio', 'Lata', 'Caja de cartón', 'Envase', 'Papel',
    'Papel de cocina', 'Bolsa de plástico', 'Revista', 'Tapa', 'Paquete',
    'Sobre', 'Caja', 'Barril',
  ],
  repair: [
    'Laptop', 'Computadora', 'Monitor', 'Pantalla', 'Televisor', 'Teclado',
    'Ratón', 'Módem', 'Impresora', 'Disco duro', 'Casete', 'Radio', 'Parlante',
    'Micrófono', 'Reproductor de música', 'Control remoto', 'Teléfono móvil',
    'Teléfono fijo', 'Tablet', 'Interruptor', 'Cargador', 'Accesorio electrónico',
    'Ventilador', 'Calefactor', 'Plancha', 'Aspiradora', 'Lavadora',
    'Lavavajillas', 'Nevera', 'Microondas', 'Estufa', 'Tostadora', 'Wafflera',
    'Asador', 'Máquina de coser', 'Cafetera', 'Cámara', 'Proyector', 'Taladro',
    'Herramienta', 'Motosierra', 'Martillo', 'Destornillador', 'Reloj',
    'Reloj de pared', 'Reloj despertador', 'Reloj de pulsera', 'Cronómetro',
    'Bicicleta', 'Monociclo', 'Triciclo', 'Moto', 'Control de videojuegos',
    'Binoculares', 'Báscula', 'Linterna', 'Lámpara',
  ],
  sell: [
    'Estantería', 'Armario', 'Cómoda', 'Vitrina', 'Escritorio', 'Mesa', 'Silla',
    'Silla mecedora', 'Sofá', 'Banca', 'Cama', 'Cuna', 'Mueble de TV',
    'Piano', 'Guitarra', 'Instrumento musical', 'Violín', 'Banjo', 'Violonchelo',
    'Arpa', 'Flauta', 'Oboe', 'Fagot', 'Saxofón', 'Armónica', 'Acordeón',
    'Tambor', 'Marimba', 'Trombón', 'Corno', 'Trompeta', 'Órgano', 'Caja fuerte',
    'Gong', 'Mancuerna', 'Pesa', 'Raqueta',
  ],
  donate: [
    'Ropa', 'Jean', 'Pantalón', 'Camiseta', 'Buzo', 'Suéter', 'Traje', 'Abrigo',
    'Chaqueta', 'Poncho', 'Ruana', 'Bata', 'Vestido', 'Falda', 'Pijama',
    'Traje de baño', 'Ropa interior', 'Medias', 'Guantes', 'Bufanda', 'Corbata',
    'Gorro', 'Sombrero', 'Pasamontañas', 'Zapatos', 'Sandalias', 'Zuecos',
    'Tenis', 'Botas', 'Bolso', 'Mochila', 'Billetera', 'Cobija', 'Almohada',
    'Toalla', 'Tapete', 'Cortina de baño', 'Persiana', 'Delantal', 'Babero',
    'Libro', 'Cuaderno', 'Juguete', 'Peluche', 'Rompecabezas', 'Balón', 'Pelota',
    'Balón de baloncesto', 'Balón de fútbol', 'Balón de voleibol', 'Esquí',
    'Casco', 'Collar', 'Joyería', 'Gafas de sol', 'Bolsa de dormir', 'Tela',
  ],
  discard: [
    'Jeringa', 'Curita', 'Pañal', 'Frasco de medicinas', 'Encendedor', 'Fósforos',
    'Aerosol', 'Hisopo', 'Papel higiénico', 'Trampa para ratones', 'Asiento de inodoro',
    'Peluca', 'Globo', 'Maquillaje', 'Labial', 'Bote de basura',
  ],
};

// ─── Estructuras derivadas (se construyen una sola vez) ───────────────────────

/** clase ImageNet (minúsculas) → conceptos en orden de relevancia. */
const LABEL_TO_CONCEPTS = new Map<string, string[]>();
for (const line of RAW_CATALOG.split('\n')) {
  const parts = line.split('>').map((p) => p.trim());
  if (parts.length < 2 || !parts[0]) continue;
  LABEL_TO_CONCEPTS.set(parts[0].toLowerCase(), parts.slice(1, 4));
}

const KNOWN_CONCEPTS = new Set<string>();
for (const concepts of LABEL_TO_CONCEPTS.values()) {
  for (const c of concepts) KNOWN_CONCEPTS.add(c.toLowerCase());
}

const CONCEPT_TO_ECO = new Map<string, EcoAction>();
for (const [action, names] of Object.entries(ECO_BY_ACTION)) {
  for (const n of names) CONCEPT_TO_ECO.set(n.toLowerCase(), action as EcoAction);
}

// ─── API ──────────────────────────────────────────────────────────────────────

/** Conceptos (español) a los que una clase de ImageNet aporta; [] si no es relevante. */
export function conceptsForLabel(imagenetLabel: string): string[] {
  return LABEL_TO_CONCEPTS.get(imagenetLabel.trim().toLowerCase()) ?? [];
}

/** Acción eco sugerida para un nombre en español, o undefined si no lo conocemos. */
export function ecoActionForConcept(name: string): EcoAction | undefined {
  return CONCEPT_TO_ECO.get(name.trim().toLowerCase());
}

/** true si el nombre es un concepto del catálogo (aunque no tenga acción eco propia). */
export function isKnownConcept(name: string): boolean {
  return KNOWN_CONCEPTS.has(name.trim().toLowerCase());
}

/** Cantidad de clases cubiertas (útil para pruebas). */
export const CATALOG_SIZE = LABEL_TO_CONCEPTS.size;
