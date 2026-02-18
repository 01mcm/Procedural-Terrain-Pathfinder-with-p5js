class Popup {
  static _instance = null;

  static getInstance() {
    if (!Popup._instance) Popup._instance = new Popup();
    return Popup._instance;
  }

  // for convenience, be able to call Popup.show({...}) anywhere
  static show({ title = "Info", text = ""} = {}) {
    Popup.getInstance().open({ title, text});
  }

  static hide() {
    Popup.getInstance().close();
  }

  constructor() {
    // backdrop
    this.backdrop = document.createElement("div");
    this.backdrop.className = "ui-modal-backdrop";

    // modal (pop up container)
    this.modal = document.createElement("div");
    this.modal.className = "ui-modal";
    this.modal.setAttribute("role", "dialog");
    this.modal.setAttribute("aria-modal", "true");

    // header
    const header = document.createElement("div");
    header.className = "ui-modal-header";

    this.titleEl = document.createElement("h2");
    this.titleEl.className = "ui-modal-title";

    this.closeBtn = document.createElement("button");
    this.closeBtn.className = "ui-modal-close";
    this.closeBtn.type = "button";
    this.closeBtn.textContent = "✕";

    header.appendChild(this.titleEl);
    header.appendChild(this.closeBtn);

    // body
    this.body = document.createElement("div");
    this.body.className = "ui-modal-body";

    this.textEl = document.createElement("div");
    this.body.appendChild(this.textEl);

    // assemble
    this.modal.appendChild(header);
    this.modal.appendChild(this.body);
    this.backdrop.appendChild(this.modal);
    document.body.appendChild(this.backdrop);

    // close interactions
    this.closeBtn.addEventListener("click", () => this.close());
    this.backdrop.addEventListener("click", (e) => {
      if (e.target === this.backdrop) this.close();
    });

    this._lastFocused = null;
  }

  open({ title, text} = {}) {
    this._lastFocused = document.activeElement;

    this.titleEl.textContent = title ?? "Info";
    this.textEl.textContent = text ?? "";

    this.backdrop.classList.add("is-open");
    
    this.closeBtn.focus();
  }

  close() {
    this.backdrop.classList.remove("is-open");
    if (this._lastFocused && typeof this._lastFocused.focus === "function") {
      this._lastFocused.focus();
    }
  }
}
