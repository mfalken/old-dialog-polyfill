goog.require('goog.positioning.AnchoredPosition');
goog.require('goog.positioning.ClientPosition');

// The overlay is used to simulate how a modal dialog blocks the document. The
// blocking dialog is positioned on top of the overlay, and the rest of the
// dialogs on the pending dialog stack are positioned below it. In the actual
// implementation, the modal dialog stacking is controlled by the top layer,
// where z-index has no effect.
OVERLAY_ZINDEX = 1000;

dm = new DialogManager();

function DialogManager() {
  this.pendingDialogStack = [];
  this.overlay = document.createElement('div');
  this.overlay.style.width = '100%';
  this.overlay.style.height = '100%';
  this.overlay.style.zIndex = OVERLAY_ZINDEX;
  this.overlay.style.position = 'fixed';
  this.overlay.style.left = '0px';
  this.overlay.style.top = '0px';
}

DialogManager.prototype.blockDocument = function() {
  if (!document.body.contains(this.overlay))
    document.body.appendChild(this.overlay);

}

DialogManager.prototype.unblockDocument = function() {
  document.body.removeChild(this.overlay);
}

DialogManager.prototype.push = function(dialog) {
  for (i = 0; i < this.pendingDialogStack.length; i++) {
    this.pendingDialogStack[i].node.style.zIndex = OVERLAY_ZINDEX - 1;
  }
  dialog.node.style.zIndex = OVERLAY_ZINDEX + 1;
  this.pendingDialogStack.push(dialog);
  this.blockDocument();
}

DialogManager.prototype.pop = function() {
  this.pendingDialogStack.pop();
  if (this.pendingDialogStack.length == 0) {
    this.unblockDocument();
  } else {
    var top = this.pendingDialogStack[this.pendingDialogStack.length - 1];
    top.node.style.zIndex = OVERLAY_ZINDEX + 1;
  }
}

function Dialog() {
  this.node = document.createElement('div');
  this.id = 'dialog';
  this.open = false;
  this.anchor = null;
  this.modal = false;
}

Dialog.prototype.reposition = function() {
  this.node.style.top = (window.innerHeight - this.node.offsetHeight) / 2;
  this.node.style.left = (window.innerWidth - this.node.offsetWidth) / 2;
}

Dialog.prototype.show = function(anchor) {
  this.showDialog(anchor, false);
}

Dialog.prototype.showModal = function(anchor) {
  this.showDialog(anchor, true);
}

Dialog.prototype.showDialog = function(anchor, isModal) {
  if (this.open) {
    throw 'InvalidStateError: showDialog called on open dialog';
  }
  this.open = true;

  // Without these lines the dialog is transparent. In the real implementation,
  // maybe the browser should draw the dialog on top of everything else and have
  // it be opaque by default.
  this.node.style.zIndex = '1000';
  this.node.style.backgroundColor = '#FFFFFF';
  this.node.style.position = 'absolute';
  document.body.appendChild(this.node);

  if (!anchor) {
    this.anchor = null;
    this.node.style.position = 'fixed';
    this.reposition();
    window.addEventListener('resize', this.reposition.bind(this));
  } else if (typeof anchor.clientX != 'undefined' &&
             typeof anchor.clientY != 'undefined') {
    this.anchor = anchor;
    var pos = new goog.positioning.ClientPosition(anchor.clientX, anchor.clientY);
    pos.reposition(this.node, goog.positioning.Corner.TOP_LEFT);
  } else {
    this.anchor = anchor;
    var pos = new goog.positioning.AnchoredPosition(
        anchor, goog.positioning.Corner.BOTTOM_RIGHT);
    pos.reposition(this.node, goog.positioning.Corner.TOP_LEFT);
  }

  if (isModal) {
    this.modal = true;
    dm.push(this);
  }
}

Dialog.prototype.close = function(retval) {
  if (!this.open)
    throw new InvalidStateError;
  this.open = false;
  document.body.removeChild(this.node);

  if (this.modal) {
    dm.pop(this);
  }

  if (typeof retval != 'undefined')
    return retval;
}
