include $(TOPDIR)/rules.mk

PKG_NAME:=luci-app-otb-ports
PKG_VERSION:=1.0.0
PKG_RELEASE:=1
PKG_LICENSE:=Apache-2.0
PKG_MAINTAINER:=OTB

include $(INCLUDE_DIR)/package.mk

define Package/luci-app-otb-ports
  SECTION:=luci
  CATEGORY:=LuCI
  SUBMENU:=3. Applications
  TITLE:=OTB physical ports, LACP and effective VLAN status
  DEPENDS:=+luci-base +rpcd +ucode +ucode-mod-fs +ip-bridge
  PKGARCH:=all
endef

define Package/luci-app-otb-ports/description
 Read-only, hardware-independent LuCI view of physical Ethernet ports, bonds
 and the VLAN state effectively programmed in the Linux bridge. VLANs inherited
 by physical LACP members are explicitly marked as inherited from their logical
 bond. No network, bridge, VLAN, bond or firewall setting is modified.
endef

define Build/Compile
endef

define Package/luci-app-otb-ports/install
	$(INSTALL_DIR) $(1)/etc/init.d
	$(INSTALL_BIN) ./root/etc/init.d/otb-ports-luci \
		$(1)/etc/init.d/otb-ports-luci
	$(INSTALL_DIR) $(1)/usr/share/rpcd/ucode
	$(INSTALL_DATA) ./root/usr/share/rpcd/ucode/luci.otb_ports \
		$(1)/usr/share/rpcd/ucode/luci.otb_ports
	$(INSTALL_DIR) $(1)/usr/share/rpcd/acl.d
	$(INSTALL_DATA) ./root/usr/share/rpcd/acl.d/luci-app-otb-ports.json \
		$(1)/usr/share/rpcd/acl.d/luci-app-otb-ports.json
	$(INSTALL_DIR) $(1)/usr/share/luci/menu.d
	$(INSTALL_DATA) ./root/usr/share/luci/menu.d/luci-app-otb-ports.json \
		$(1)/usr/share/luci/menu.d/luci-app-otb-ports.json
	$(INSTALL_DIR) $(1)/www/luci-static/resources/view/status
	$(INSTALL_DATA) ./htdocs/luci-static/resources/view/status/otb-ports.js \
		$(1)/www/luci-static/resources/view/status/otb-ports.js
	$(INSTALL_DIR) $(1)/usr/share/otb-luci-overrides
	$(INSTALL_DATA) ./root/usr/share/otb-luci-overrides/29_ports.js \
		$(1)/usr/share/otb-luci-overrides/29_ports.js
endef

define Package/luci-app-otb-ports/postinst
#!/bin/sh
[ -n "$${IPKG_INSTROOT}" ] || {
	/etc/init.d/otb-ports-luci enable >/dev/null 2>&1 || true
	/etc/init.d/otb-ports-luci start >/dev/null 2>&1 || true
	/etc/init.d/rpcd restart >/dev/null 2>&1 || true
	rm -f /tmp/luci-indexcache /tmp/luci-modulecache/* 2>/dev/null || true
}
exit 0
endef

$(eval $(call BuildPackage,luci-app-otb-ports))
