/* cb.js

{{IS_NOTE
	Purpose:
		combobox, bandbox
	Description:
		
	History:
		Fri Dec 16 18:28:03     2005, Created by tomyeh
}}IS_NOTE

Copyright (C) 2005 Potix Corporation. All Rights Reserved.

{{IS_RIGHT
	This program is distributed under GPL Version 2.0 in the hope that
	it will be useful, but WITHOUT ANY WARRANTY.
}}IS_RIGHT
*/
zk.load("zul.widget");

////
//Customization
/** Returns the background color for a combo item.
 * Developer can override this method by providing a different background.
 */
if (!window.Comboitem_effect) { //define it only if not customized
	window.Comboitem_effect = function (item, undo) {
		if (undo) {
			zk.rmClass(item, "overseld");
			zk.rmClass(item, "overd");
		} else
			zk.addClass(item, zk.hasClass(item, "seld") ? "overseld": "overd");
	};
}

////
zkCmbox = {};
zkCmbox.init = function (cmp) {
	zkCmbox.onVisi = zkWgt.fixDropBtn; //widget.js is ready now
	zkCmbox.onHide = zkTxbox.onHide; //widget.js is ready now

	var inp = $real(cmp);
	zkTxbox.init(inp);
	zk.listen(inp, "keydown", zkCmbox.onkey);
	zk.listen(inp, "click", function () {if (inp.readOnly && !zk.dragging) zkCmbox.onbutton(cmp);});
		//To mimic SELECT, it drops down if readOnly

	var btn = $e(cmp.id + "!btn");
	if (btn) {
		zk.listen(btn, "click", function () {if (!inp.disabled && !zk.dragging) zkCmbox.onbutton(cmp);});
		zkWgt.fixDropBtn(cmp);
	}
};

zkCmit = {};
zkCmit.init = function (cmp) {
	zk.listen(cmp, "click", zkCmit.onclick);
	zk.listen(cmp, "mouseover", zkCmit.onover);
	zk.listen(cmp, "mouseout", zkCmit.onout);
};
/** When an item is clicked. */
zkCmit.onclick = function (evt) {
	if (!evt) evt = window.event;
	var item = $parentByTag(Event.element(evt), "TR");
	if (item) {
		zkCmbox._selback(item);
		zkau.closeFloats($outer($parent(item)));
			//including combobox, but excluding dropdown
		zkCmit.onoutTo(item); //onmouseout might be sent (especiall we change parent)

		//Request 1537962: better responsive
		var inp = zkCmbox.getInputByItem(item);
		if (inp) zkTxbox.updateChange(inp, false); //fire onChange
		var uuid = $uuid(inp);
		Event.stop(evt); //Bug 1597852 (cb might be a child of listitem)
		zkau.send({uuid: uuid, cmd: "onSelect", data: [item.id]},
				zkau.asapTimeout($e(uuid), "onSelect"));
	}
};

/** onmouoseover(evt). */
zkCmit.onover = function (evt) {
	if (!zk.dragging) {
		if (!evt) evt = window.event;
		var item = $parentByTag(Event.element(evt), "TR");
		if (item) Comboitem_effect(item);
	}
};
/** onmouseout(evt). */
zkCmit.onout = function (evt) {
	if (!zk.dragging) {
		if (!evt) evt = window.event;
		zkCmit.onoutTo($parentByTag(Event.element(evt), "TR"));
	}
};
zkCmit.onoutTo = function (item) {
	if (item) Comboitem_effect(item, true);
};

/** Handles setAttr. */
zkCmbox.setAttr = function (cmp, nm, val) {
	if (nm == "repos") { //hilite the most matched item
		var pp = $e(cmp.id + "!pp");
		if (pp) {
			pp.removeAttribute("zk_ckval"); //re-check is required
			if ($visible(pp))
				zkCmbox._open(cmp, cmp.id, pp, true);
		}
		return true;
	} else if ("style" == nm) {
		var inp = $real(cmp);
		if (inp) zkau.setAttr(inp, nm, zk.getTextStyle(val, true, true));
	} else if ("style.width" == nm) {
		var inp = $real(cmp);
		if (inp) {
			inp.style.width = val;
			return true;
		}
	} else if ("style.height" == nm) {
		var inp = $real(cmp);
		if (inp) {
			inp.style.height = val;
			return true;
		}
	} else if ("z.btnVisi" == nm) {
		var btn = $e(cmp.id + "!btn");
		if (btn) btn.style.display = val == "true" ? "": "none";
		zkWgt.fixDropBtn(cmp);
		return true;
	} else if ("z.sel" == nm ) {
		return zkTxbox.setAttr(cmp, nm, val);
	}
	zkau.setAttr(cmp, nm, val);
	return true;
};
zkCmbox.rmAttr = function (cmp, nm) {
	if ("style" == nm) {
		var inp = $real(cmp);
		if (inp) zkau.rmAttr(inp, nm);
	} else if ("style.width" == nm) {
		var inp = $real(cmp);
		if (inp) inp.style.width = "";
	} else if ("style.height" == nm) {
		var inp = $real(cmp);
		if (inp) inp.style.height = "";
	}
	zkau.rmAttr(cmp, nm);
	return true;
};

zkCmbox.childchg = function (cb) {
	//we have to re-adjust the width since children are added/removed
	var pp = $e(cb.id + "!pp");
	if (!$visible(pp))
		return;

	var ppofs = zkCmbox._ppofs(pp);
	if (ppofs[0] == "auto") {
		var pp2 = $e(cb.id + "!cave");
		if (zk.ie) {
			if (pp2) pp2.style.width = "";
			pp.style.width = "";
			setTimeout("zkCmbox._cc2('"+cb.id+"')", 0);
				//we cannot handle it immediately in IE
		} else {
			zkCmbox._fixsz(cb, pp, pp2, ppofs);
		}
	}
};
zkCmbox._cc2 = function (uuid) {
	var cb = $e(uuid);
	var pp = $e(uuid + "!pp");
	if ($visible(pp))
		zkCmbox._fixsz(cb, pp, $e(cb.id + "!cave"), zkCmbox._ppofs(pp));
};

/** Eats UP/DN keys. */
zkCmbox.ondown = function (evt) {
	//IE: if NOT eat UP/DN here, it de-select the text
	//IE: if we eat UP/DN here, onpress won't be sent
	//IE: we have to handle UP/DN in onup (so the repeat feature is lost)
	if (evt.keyCode == 38 || evt.keyCode == 40) { //UP and DN
		Event.stop(evt);
		return false;
	}
	if (evt.keyCode == 9) { //TAB; IE: close now so to show covered SELECT
		var inp = Event.element(evt);
		if (inp) {
			var uuid = $uuid(inp.id);
			var pp = $e(uuid + "!pp");
			if ($visible(pp)) zkCmbox.close(pp);
		}
	}
	return true;
};
zkCmbox.onkey = function (evt) {
	var inp = Event.element(evt);
	if (!inp) return true;

	var uuid = $uuid(inp.id);
	var cb = $e(uuid);
	var pp = $e(uuid + "!pp");
	if (!pp) return true;

	var opened = $visible(pp);
	if (evt.keyCode == 9 || (zk.safari && evt.keyCode == 0)) { //TAB or SHIFT-TAB (safari)
		if (opened) zkCmbox.close(pp);
		return true;
	}

	if (evt.altKey && (evt.keyCode == 38 || evt.keyCode == 40)) {//UP/DN
		if (evt.keyCode == 38) { //UP
			if (opened) zkCmbox.close(pp);
		} else {
			if (!opened) zkCmbox.open(pp, true);
		}
		//FF: if we eat UP/DN, Alt+UP degenerate to Alt (select menubar)
		if (zk.ie) {
			Event.stop(evt);
			return false;
		}
		return true;
	}

	//Request 1537962: better responsive
	if (opened && evt.keyCode == 13) { //ENTER
		zkCmbox._autoselback(uuid); //Better usability(Bug 1633335): auto selback
		zkTxbox.updateChange(inp, false); //fire onChange
		return true;
	}

	if (evt.keyCode == 18 || evt.keyCode == 27 || evt.keyCode == 13
	|| (evt.keyCode >= 112 && evt.keyCode <= 123)) //ALT, ESC, Enter, Fn
		return true; //ignore it (doc will handle it)

	var bCombobox = $type(cb) == "Cmbox";
	var selback = evt.keyCode == 38 || evt.keyCode == 40; //UP and DN
	if (getZKAttr(cb, "adr") == "true" && !opened)
		zkCmbox.open(pp, bCombobox && !selback);
	else if (!bCombobox)
		return true; //ignore
	else if (!selback && opened)
		setTimeout("zkCmbox._hilite('"+uuid+"')", 1); //IE: keydown

	if (selback/* || getZKAttr(cb, "aco") == "true"*/) {
		//Note: zkCmbox.open won't repos immediately, so we have to delay it
		setTimeout("zkCmbox._hilite('"+uuid+"',true,"+(evt.keyCode == 38)+")", 3);
		Event.stop(evt);
		return false;
	}
	return true;
};

/* Whn the button is clicked on button. */
zkCmbox.onbutton = function (cmp) {
	var pp = $e(cmp.id + "!pp");
	if (pp) {
		if (!$visible(pp)) zkCmbox.open(pp, true);
		else zkCmbox.close(pp, true);
	}
};

/** Marks an item as selected or un-selected. */
zkCmbox._setsel = function (item, sel) {
	zk.addClass(item, "seld", sel);
};

/** Returns the text contained in the specified item. */
zkCmbox.getLabel = function (item) {
	return item && item.cells && item.cells.length > 1 ?
		zk.getElementValue(item.cells[1]): ""; 
};

zkCmbox.open = function (pp, hilite) {
	pp = $e(pp);
	var uuid = $uuid(pp.id);
	var cb = $e(uuid);
	if (!cb) return;

	zkau.closeFloats(pp);
	zkCmbox._pop.addFloatId(pp.id, $type(cb) != "Cmbox");

	zkCmbox._open(cb, uuid, pp, hilite);

	if (zkau.asap(cb, "onOpen"))
		zkau.send({uuid: uuid, cmd: "onOpen", data: [true]});
};
zkCmbox._open = function (cb, uuid, pp, hilite) {
	var ppofs = zkCmbox._ppofs(pp);
	pp.style.width = ppofs[0];
	pp.style.height = "auto";

	var pp2 = $e(uuid + "!cave");
	if (pp2) pp2.style.width = pp2.style.height = "auto";
	pp.style.position = "absolute"; //just in case
	pp.style.display = "block";
	pp.style.zIndex = "88000";
	zk.onVisiAt(pp);

	//FF: Bug 1486840
	//IE: Bug 1766244 (after specifying position:relative to grid/tree/listbox)
	//NOTE: since the parent/child relation is changed, new listitem
	//must be inserted into the popup (by use of uuid!child) rather
	//than invalidate!!
	zk.setVParent(pp);

	zkCmbox._fixsz(cb, pp, pp2, ppofs);//fix size

	zk.position(pp, $real(cb), "after-start");

	setTimeout("zkCmbox._repos('"+uuid+"',"+hilite+")", 3);
		//IE issue: we have to re-position again because some dimensions
		//might not be correct here
};
/** Returns [width, height] for the popup if specified by user. */
zkCmbox._ppofs = function (pp) {
	for (var n = pp.firstChild; n; n = n.nextSibling)
		if (n.id) {
			if (!n.id.endsWith("!cave")) { //bandbox's popup
				var w = n.style.width, h = n.style.height; 
				return [w ? w: "auto", h ? h: "auto"];
			}
			break;
		}
	return ["auto", "auto"];
};

/** Fixes the dimension of popup. */
zkCmbox._fixsz = function (cb, pp, pp2, ppofs) {
	if (ppofs[1] == "auto" && pp.offsetHeight > 250) {
		pp.style.height = "250px";
	} else if (pp.offsetHeight < 10) {
		pp.style.height = "10px"; //minimal
	}

	if (ppofs[0] == "auto") {
		if (pp.offsetWidth < cb.offsetWidth) {
			pp.style.width = cb.offsetWidth + "px";
			if (pp2) pp2.style.width = "100%";
				//Note: we have to set width to auto and then 100%
				//Otherwise, the width is too wide in IE
		} else {
			var wd = zk.innerWidth() - 20;
			if (wd < cb.offsetWidth) wd = cb.offsetWidth;
			if (pp.offsetWidth > wd) pp.style.width = wd;
		}
	}
};
/** Re-position the popup. */
zkCmbox._repos = function (uuid, hilite) {
	var cb = $e(uuid);
	if (!cb) return;

	var pp = $e(uuid + "!pp");
	var pp2 = $e(uuid + "!cave");
	var inpId = cb.id + "!real";
	var inp = $e(inpId);

	//FF issue:
	//If both horz and vert scrollbar are visible:
	//a row might be hidden by the horz bar.
	var rows = pp2 ? pp2.rows: null;
	if (rows) {
		var gap = pp.offsetHeight - pp.clientHeight;
		if (gap > 10 && pp.offsetHeight < 150) { //scrollbar
			var hgh = 0;
			for (var j = rows.length; --j >= 0;)
				hgh += rows[j].offsetHeight;
			pp.style.height = (hgh + 20) + "px";
				//add the height of scrollbar (18 is an experimental number)
		}
	}

	zk.position(pp, inp, "after-start");
	zkau.hideCovered();
	zk.asyncFocus(inpId);

	if (hilite) zkCmbox._hilite(uuid);
};

/** Selects back the specified item. */
zkCmbox._selback = function (item) {
	var txt = zkCmbox.getLabel(item); 

	var inp = zkCmbox.getInputByItem(item);
	if (inp) {
		inp.value = txt;
		inp.setAttribute("zk_changing_selbk", txt); //used with onChanging (widget.js)
		zk.asyncFocus(inp.id);
		zk.asyncSelect(inp.id);
	}
};
/** Selects back the current hilited item, if any. */
zkCmbox._autoselback = function (uuid) {
	var pp2 = $e(uuid + "!cave");
	if (!pp2) return;

	var rows = pp2.rows;
	if (!rows) return;

	for (var j = 0; j < rows.length; ++j) {
		var item = rows[j];
		if (item.getAttribute("zk_hilite") == "true")
			zkCmbox._selback(item);
	}
};

/** Returns the input by specifying an item. */
zkCmbox.getInputByItem = function (item) {
	//we cannot use $parentByType because parentNode is changed in gecko
	var uuid = $uuid(item.parentNode);
	if (!uuid) return null;

	var inpId = uuid + "!real";
	return $e(inpId);
}

/** Auto-hilite the most matched item.
 * @param selback whether to select back (either UP or DN is pressed)
 * @param bUp whether UP is pressed
 */
zkCmbox._hilite = function (uuid, selback, bUp) {
	var inp = $e(uuid + "!real");
	if (!inp) return;

//	var aco = getZKAttr($e(uuid), "aco") == "true";
	var pp = $e(uuid + "!pp");
	if (!pp || (!selback && /*!aco &&*/ !$visible(pp))) return;
	var pp2 = $e(uuid + "!cave");
	if (!pp2) return;
	var rows = pp2.rows;
	if (!rows) return;

	//The comparison is case-insensitive
	var inpval = inp.value.toLowerCase();
	if (!selback && pp.getAttribute("zk_ckval") == inpval)
		return; //not changed

	//Identify the best matched item
	var jfnd = -1, exact = !inpval, old;
	for (var j = 0; j < rows.length; ++j) {
		var item = rows[j];
		if (!exact) {
			var txt = zkCmbox.getLabel(item).toLowerCase();
			if (txt == inpval) {
				exact = true;
				jfnd = j;
			} else if (jfnd < 0 && txt.startsWith(inpval)) {
				jfnd = j;
			}
		}
		if (item.getAttribute("zk_hilite") == "true") {
			if (old) { //impossible but recovering from error
				zkCmbox._setsel(item, false);
				item.removeAttribute("zk_hilite");
			} else {
				old = item;
			}
		}
	}

	var found;
	if (selback) {
		if (jfnd < 0) {
			if (rows.length) found = rows[0];
		} else {
			if (exact) {
				var b = document.selection;
				if ((b && "Text" == b.type && document.selection.createRange().text.toLowerCase() == inpval)
				|| (!b && inpval.length && inp.selectionStart == 0
					&& inp.selectionEnd == inpval.length)) {
					if (bUp) {
						if (jfnd > 0) --jfnd;
					} else {
						if (jfnd + 1 < rows.length) ++jfnd;
					}
				}
			}
			if (jfnd >= 0) found = rows[jfnd];
		}
		if (found) zkCmbox._selback(found);
	} else if (jfnd >= 0) {
		found = rows[jfnd];
	}

	if (old != found) {
		if (old) {
			zkCmbox._setsel(old, false);
			old.removeAttribute("zk_hilite");
		}
		if (found) {
			zkCmbox._setsel(found, true);
			found.setAttribute("zk_hilite", "true");
		}
	}

	zk.scrollIntoView(pp, found); //make sure found is visible

	pp.setAttribute("zk_ckval", inpval);
};

/** Called from the server to close the popup based on combobox, not popup.
 */
zkCmbox.cbclose = function (cb) {
	zkCmbox.close(cb.id + "!pp", true);
};
zkCmbox.close = function (pp, focus) {
	pp = $e(pp);
	var uuid = $uuid(pp.id);	
	pp.style.display = "none";
	zk.unsetVParent(pp);

	zkCmbox._pop.removeFloatId(pp.id);
	zk.onHideAt(pp);
	zkau.hideCovered();

	if (focus)
		zk.asyncFocus(uuid + "!real");

	var cb = $outer(pp);
	if (cb && zkau.asap(cb, "onOpen"))
		zkau.send({uuid: cb.id, cmd: "onOpen", data: [false]});
};

zk.FloatCombo = Class.create();
Object.extend(Object.extend(zk.FloatCombo.prototype, zk.Floats.prototype), {
	_close: function (el) {
		zkCmbox.close(el);
	}
});
if (!zkCmbox._pop)
	zkau.floats.push(zkCmbox._pop = new zk.FloatCombo()); //hook to zkau.js

//-- bandbox --//
zkBdbox = zkCmbox;
