# Anatomia 3D

Atlas de anatomia 3D open-source para o navegador, com layout inspirado em apps
como o Anatomy Learning. Feito com **React (Vite) + React Three Fiber + drei + zustand**,
usando o atlas **[Z-Anatomy](https://www.z-anatomy.com/)**.

## Rodando

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # gera dist/ (site estático: Vercel, Netlify, GitHub Pages…)
```

Os modelos já exportados ficam em `public/zanatomy/` e vão junto no repositório.
Só é preciso o Blender se você quiser **reexportar** (veja abaixo).

## O que tem

- **7 sistemas** (esquelético, articulações/ligamentos, muscular, cardiovascular,
  linfático, nervoso e sentidos, viscerais), cerca de **2.900 peças 3D** e **2.000 estruturas**
  organizadas em árvore. Cada sistema só é baixado quando ligado.
- **Barra lateral** com a árvore do atlas, olho para mostrar/ocultar qualquer nível e
  **busca** em estruturas e acidentes anatômicos.
- **Visualizador 3D**: girar, zoom, mover, hover, clique (seleção que destaca e abre o
  caminho na árvore), enquadramento automático da peça.
- **Painel** com caminho (ex.: *Bones of lower limb › … › Femur*), **Isolar**, **Ocultar**,
  **Enquadrar** e descrição completa (inglês, Wikipedia via Z-Anatomy).
- **Pins** dos acidentes da peça selecionada (ex.: trocânter maior no fêmur), clicáveis.
- **Raio-X**: tudo translúcido, menos a seleção.

## Estrutura

```
tools/export_zanatomy.py     # Blender -> public/zanatomy (GLB + catálogo + textos)
public/zanatomy/             # gerado: <sistema>.glb, catalog.json, text-<sistema>.json
public/draco/                # decodificador Draco (copiado de three/examples)
src/
├── lib/catalog.js           # leitura do catálogo, árvore, busca, textos sob demanda
├── lib/meshRegistry.js      # chave -> meshes (para enquadrar a câmera)
├── store/useAnatomyStore.js # estado global (zustand)
└── components/
    ├── ui/                  # Sidebar (árvore + busca), Toolbar, InfoPanel
    └── viewer/              # Viewer, SystemModel (GLB por sistema), Pins, CameraRig
```

## Reexportando o atlas

1. Instale o [Blender](https://www.blender.org/download/) (testado no 5.3).
2. Baixe `Z-Anatomy_Template.zip` da [pasta oficial no Google Drive](https://drive.google.com/drive/folders/18M7IuH2ai2fl21Ud0YH1mSlNEPPmcZzq)
   (link do [GitHub do projeto](https://github.com/LluisV/Z-Anatomy)) para `raw/`.
3. Extraia: `raw/Z-Anatomy_Template.zip` → `raw/extracted/`, e o `Z-Anatomy.zip` de dentro
   → `raw/extracted/atlas/` (fica `raw/extracted/atlas/Z-Anatomy/Startup.blend`).
4. Rode (≈4 min, usa vários GB de RAM — feche outros programas):

```bash
"C:/Program Files/Blender Foundation/Blender 5.3/blender.exe" -b --factory-startup --disable-autoexec \
  raw/extracted/atlas/Z-Anatomy/Startup.blend --python tools/export_zanatomy.py -- public/zanatomy
```

`--disable-autoexec` impede que scripts embutidos no `.blend` rodem. A pasta `raw/` está
no `.gitignore`. Ajustes (sistemas, cores, quantidade de triângulos) ficam no topo do script.

### Ainda não exportado

- Inserções musculares (origem/inserção sobre os ossos) e Regiões do corpo.
- Alguns pins (ex.: vários do fêmur) não têm posição salva no atlas — o app os ignora.

## Licença e créditos

Modelos: Z-Anatomy — CC BY-SA 4.0, baseado em BodyParts3D © The Database Center for
Life Science — CC BY-SA 2.1 Japan. Textos: Wikipedia — CC BY-SA. Os créditos aparecem
no rodapé da barra lateral. Derivados dos modelos devem manter a licença CC BY-SA.

## Próximos passos

- Tradução para português (nomes e textos).
- Modo quiz, cortes (clipping planes), inserções musculares.
- PWA para estudar offline no celular.
