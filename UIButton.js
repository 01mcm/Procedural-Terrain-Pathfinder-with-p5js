class UIButton {
  constructor(label, x, y, onClick, extraClasses = []) {
    this.el = createButton(label);

    if (x !== undefined && y !== undefined) {
      this.el.position(x,y);
    }

    // base class
    this.el.addClass('ui-button');

    // extra classes
    extraClasses.forEach(c => this.el.addClass(c));

    if (onClick) this.el.mousePressed(onClick);
  }

  setText(txt) {
    this.el.html(txt);
  }

  addClass(cls) {
    this.el.addClass(cls);
  }

  removeClass(cls) {
    this.el.removeClass(cls);
  }

  hide() {
    this.el.hide();
  }

  show() {
    this.el.show();
  }
}