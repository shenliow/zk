/* Menuseparator.java

{{IS_NOTE
	Purpose:
		
	Description:
		
	History:
		Thu Sep 22 10:59:00     2005, Created by tomyeh
}}IS_NOTE

Copyright (C) 2005 Potix Corporation. All Rights Reserved.

{{IS_RIGHT
	This program is distributed under GPL Version 2.0 in the hope that
	it will be useful, but WITHOUT ANY WARRANTY.
}}IS_RIGHT
*/
package org.zkoss.zul;

import org.zkoss.zul.impl.XulElement;

/**
 * Used to create a separator between menu items.
 *
 *<p>Default {@link #getZclass}: z-menu-separator. (since 3.5.0)
 * 
 * @author tomyeh
 */
public class Menuseparator extends XulElement {

	//-- Component --//
	public String getZclass() {
		return _zclass == null ? "z-menu-separator" : super.getZclass();
	}
	/** Not childable. */
	public boolean isChildable() {
		return false;
	}
	public boolean isPopup(){
		return getParent() instanceof Menupopup;
	}
}
