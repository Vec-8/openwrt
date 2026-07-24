include $(TOPDIR)/rules.mk

PKG_NAME:=luci-app-otb-clients
PKG_VERSION:=1.0.0
PKG_RELEASE:=6
PKG_LICENSE:=Apache-2.0
PKG_MAINTAINER:=OTB

include $(INCLUDE_DIR)/package.mk

define Package/luci-app-otb-clients
  SECTION:=luci
  CATEGORY:=LuCI
  SUBMENU:=3. Applications
  TITLE:=OTB unified Wi-Fi and Ethernet client diagnostics
  DEPENDS:=+luci-base +rpcd +ucode +ucode-mod-fs +ucode-mod-ubus +ucode-mod-uci +ucode-mod-nl80211 +ip-bridge +ethtool-full +jshn
  PKGARCH:=all
endef

define Package/luci-app-otb-clients/description
 Read-only diagnostics for Wi-Fi and directly attached Ethernet clients seen by
 the BPI-R4 Pro, Sud and Nord nodes. It also preserves the validated LuCI VLAN
 resolver on every R4, displays inherited VLAN IDs directly on physical LACP
 member ports and restores the pre-update OTB WAN/equipment dashboard on the
 R4 Pro. The collector never changes network, Wi-Fi, bridge, VLAN, DSA or
 firewall configuration.
endef

define Package/luci-app-otb-clients/conffiles
/etc/config/otb-clients
endef

define Build/Compile
endef

define Package/luci-app-otb-clients/install
	$(INSTALL_DIR) $(1)/etc/config
	$(INSTALL_CONF) ./root/etc/config/otb-clients $(1)/etc/config/otb-clients
	$(INSTALL_DIR) $(1)/etc/init.d
	$(INSTALL_BIN) ./root/etc/init.d/otb-clients $(1)/etc/init.d/otb-clients
	$(INSTALL_BIN) ./root/etc/init.d/otb-luci-restore $(1)/etc/init.d/otb-luci-restore
	$(INSTALL_DIR) $(1)/usr/sbin
	$(INSTALL_BIN) ./root/usr/sbin/otb-clients $(1)/usr/sbin/otb-clients
	$(INSTALL_BIN) ./root/usr/sbin/otb-clients-snapshot $(1)/usr/sbin/otb-clients-snapshot
	$(INSTALL_DIR) $(1)/usr/share/rpcd/ucode
	$(INSTALL_DATA) ./root/usr/share/rpcd/ucode/otb-clients.uc $(1)/usr/share/rpcd/ucode/otb-clients.uc
	$(INSTALL_DIR) $(1)/usr/share/rpcd/acl.d
	$(INSTALL_DATA) ./root/usr/share/rpcd/acl.d/luci-app-otb-clients.json $(1)/usr/share/rpcd/acl.d/luci-app-otb-clients.json
	$(INSTALL_DIR) $(1)/usr/share/luci/menu.d
	$(INSTALL_DATA) ./root/usr/share/luci/menu.d/luci-app-otb-clients.json $(1)/usr/share/luci/menu.d/luci-app-otb-clients.json
	$(INSTALL_DIR) $(1)/www/luci-static/resources/view/otb-clients
	$(INSTALL_DATA) ./htdocs/luci-static/resources/view/otb-clients/status.js $(1)/www/luci-static/resources/view/otb-clients/status.js
	$(INSTALL_DATA) ./htdocs/luci-static/resources/view/otb-clients/lacp.js $(1)/www/luci-static/resources/view/otb-clients/lacp.js
	$(INSTALL_DIR) $(1)/usr/libexec/otb-lacp
	$(INSTALL_BIN) ./root/usr/libexec/otb-lacp/status.sh $(1)/usr/libexec/otb-lacp/status.sh
	$(INSTALL_DIR) $(1)/usr/share/otb-luci-overrides
	$(CP) ./root/usr/share/otb-luci-overrides/* $(1)/usr/share/otb-luci-overrides/
endef

define Package/luci-app-otb-clients/postinst
#!/bin/sh
[ -n "$${IPKG_INSTROOT}" ] || {
	/etc/init.d/otb-luci-restore enable >/dev/null 2>&1 || true
	/etc/init.d/otb-luci-restore start >/dev/null 2>&1 || true
}
exit 0
endef

$(eval $(call BuildPackage,luci-app-otb-clients))
