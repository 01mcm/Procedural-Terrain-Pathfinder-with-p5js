# Procedural Terrain Pathfinder (p5.js)

A procedural 3D terrain generator with an A\* pathfinding layer and a UI
overlay.\
Generate a new map, switch between 3D and top-down mode, select two
points, and compute the lowest-cost path across terrain types. The
environment also cycles through time-of-day (day/sunset/night/sunrise)
with a starry sky at night and a time-based cost multiplier that affects
the final path cost.

------------------------------------------------------------------------

## Features

### Terrain generation

-   Procedural heightmap using Perlin noise
-   Terrain classification into biomes:
    -   water, sand, swamp, grass, jungle, forest, mountain, snowy
-   Water is treated as blocked for pathfinding

### Pathfinding (A\*)

-   Select **two points** to compute a path
-   Uses **4-direction movement** (up/down/left/right)
-   Cost is based on terrain type (e.g. grass cheaper than mountain)
-   Displays:
    -   Step-by-step debug output in console
    -   Terrain tile counts along the path
    -   Total path cost

### Views / interaction

-   **3D view** with orbit controls (mouse drag)
-   **Top-down view** with:
    -   SHIFT + click to select points
    -   Right-click + drag to pan
    -   Scroll to zoom

### Time-of-day system

-   Smooth transitions through 4 stages:
    -   day → sunset → night → sunrise
-   Night sky includes star field
-   Time-of-day cost multiplier (captured at selection time):
    -   day ×1
    -   sunrise/sunset ×2
    -   night ×3

### UI

-   Top toolbar with:
    -   Generate New Map
    -   Help popup
    -   View toggle (desktop only)
-   Two legends:
    -   Terrain Costs legend
    -   Path Summary legend (counts + total cost)
-   Legends support minimizing/restoring

------------------------------------------------------------------------

## Controls

### Desktop

**3D view** - Mouse drag: orbit camera - Scroll: zoom (via
orbitControl) - Button: switch to Top-Down

**Top-Down view** - **SHIFT + Left Click**: select start/end points -
**Right Click + Drag**: pan - **Scroll**: zoom - Button: switch back to
3D

### Mobile

-   View toggle + point selection are disabled (UI avoids unsupported
    interaction)

------------------------------------------------------------------------

## How it works (high level)

1.  **Generate terrain**
    -   Sample Perlin noise → normalize → convert to elevation + terrain
        type
2.  **Pick points**
    -   In top-down mode, SHIFT-click two grid cells
3.  **Compute A**\*
    -   Movement cost = terrain cost of the cell entered\
    -   Water cells are not allowed
    -   Final cost = raw cost × time-of-day multiplier (captured at
        selection time)
4.  **Render**
    -   Terrain mesh drawn as a triangle strip grid
    -   Water plane drawn on top
    -   Sky rendered as a textured sphere using an offscreen graphics
        buffer

------------------------------------------------------------------------

## Project structure

Typical file layout:

-   `index.html`\
    Loads p5.js and your scripts
-   `sketch.js`\
    Main p5 scene: terrain generation, rendering, input, A\*
-   `legend.js`\
    `UILegend` UI class for the terrain/path summaries
-   `popup.js`\
    `Popup` UI class for help / warnings
-   `style.css`\
    UI styling for toolbar, legends, modal popup


------------------------------------------------------------------------

## Run locally

Because this project uses multiple JS files, it’s best to run it through a local server.

### Option A (VS Code)
- Install **Live Server**
- Right-click `index.html` → **Open with Live Server**

### Option B (Python)
- python -m http.server 8000
(or python3)
- Run the server on a browser tab (localhost): http://[::]:8000/
