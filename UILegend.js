class UILegend {
  constructor({
    title = "Legend",
    nameToId,
    order,
    getColor,
    containerClass = "ui-legend",
    side = "left",
  }) {
    this.title = title;
    this.nameToId = nameToId;
    this.order = order;
    this.getColor = getColor;
    this.side = side;

    // container
    this.el = createDiv();
    this.el.addClass(containerClass);
    if (side === "right") this.el.addClass("right");

    this._bodyId = `legendBody_${Math.random().toString(16).slice(2)}`;

    this.el.html(`
      <div class="legend-header">
        <h3 class="legend-title">${this.title}</h3>
        <button class="legend-minimize" type="button" aria-label="Hide legend">–</button>
      </div>
      <div id="${this._bodyId}"></div>
    `);

    this._minBtn = this.el.elt.querySelector(".legend-minimize");
    this._minBtn?.addEventListener("click", (e) => {
      e.stopPropagation();
      this.minimize();
    });

    // launcher when minimized
    this.launcher = createDiv(side === "right" ? "◀" : "≡");
    this.launcher.addClass("ui-legend-launcher");
    if (side === "right") this.launcher.addClass("right");
    this.launcher.mousePressed(() => this.restore());

    this._isMinimized = false;
    this.hide();
  }

  parent(parentEl) {
    this.el.parent(parentEl);
    this.launcher.parent(parentEl);
  }

  setSide(side) {
    this.side = side;
    const isRight = side === "right";
    this.el.toggleClass("right", isRight);
    this.launcher.toggleClass("right", isRight);
    this.launcher.html(isRight ? "◀" : "≡");
  }

  // internal helpers 
  _getBody() {
    return document.getElementById(this._bodyId);
  }

  _setDisplay(p5El, value) {
    p5El.style("display", value);
  }

  _p5ColorToCSS(c) {
    return `rgb(${red(c)}, ${green(c)}, ${blue(c)})`;
  }

  _getDotColor(colorId) {
    return colorId == null ? color(255, 0, 255) : this.getColor(colorId);
  }

  _rowHTML({ name, rightText = "", dotColor = null, extraClass = "" }) {
    const dot = dotColor? `<span class="legend-dot" style="background:${this._p5ColorToCSS(dotColor)};"></span>`
      : "";

    return `
      <div class="legend-row ${extraClass}">
        <div class="legend-left">
          ${dot}
          <span class="legend-name">${name}</span>
        </div>
        <span class="legend-count">${rightText}</span>
      </div>
    `;
  }

  _render(html) {
    const body = this._getBody();
    if (!body) return;

    body.innerHTML = html;

    if (!this._isMinimized) this._setDisplay(this.el, "block");
  }

  // visibility 
  hide() {
    this._setDisplay(this.el, "none");
    this._setDisplay(this.launcher, "none");
    this._isMinimized = false;
  }

  minimize() {
    this._setDisplay(this.el, "none");
    this._setDisplay(this.launcher, "flex");
    this._isMinimized = true;
  }

  restore() {
    this._setDisplay(this.el, "block");
    this._setDisplay(this.launcher, "none");
    this._isMinimized = false;
  }

  clear() {
    const body = this._getBody();
    if (body) body.innerHTML = "";
    this.hide();
  }

  // content
  show(counts, totalCost, infoText) {
    const parts = [];

    for (const t of this.order) {
      const name = t.name;
      const count = counts?.[name] ?? 0;
      if (count <= 0) continue;

      const terrainId = this.nameToId?.[name];
      const col = this._getDotColor(terrainId);

      parts.push(
        this._rowHTML({
          name,
          rightText: `${count} tiles`,
          dotColor: col,
        })
      );
    }

    if (infoText) {
      parts.push(
        this._rowHTML({
          name: infoText,
          extraClass: "legend-footer",
        })
      );
    }

    parts.push(`
      <div class="legend-total">
        <span>Total cost</span>
        <span>${Number(totalCost).toFixed(0)}</span>
      </div>
    `);

    this._render(parts.join(""));
  }

  showKeyValueRows(entries, { valueFormatter = (v) => String(v), footer = null } = {}) {
    const parts = entries.map(({ name, value, colorId }) => {
      const col = this._getDotColor(colorId);
      return this._rowHTML({
        name,
        rightText: valueFormatter(value),
        dotColor: col,
      });
    });

    if (footer) {
      parts.push(
        this._rowHTML({
          name: footer.label,
          rightText: footer.value, 
          extraClass: "legend-footer",
        })
      );
    }

    this._render(parts.join(""));
  }
}

