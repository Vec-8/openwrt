include $(TOPDIR)/rules.mk

PKG_NAME:=luci-app-otb-clients
PKG_VERSION:=1.0.0
PKG_RELEASE:=8
PKG_LICENSE:=Apache-2.0
PKG_MAINTAINER:=OTB

include $(INCLUDE_DIR)/package.mk

define Package/luci-app-otb-clients
  SECTION:=luci
  CATEGORY:=LuCI
  SUBMENU:=3. Applications
  TITLE:=OTB unified Wi-Fi and Ethernet client diagnostics
  DEPENDS:=+luci-base +luci-app-otb-ports +rpcd +ucode +ucode-mod-fs +ucode-mod-ubus +ucode-mod-uci +ucode-mod-nl80211 +ip-bridge +ethtool-full +jshn
  PKGARCH:=all
endef

define Package/luci-app-otb-clients/description
 Read-only diagnostics for Wi-Fi and directly attached Ethernet clients seen by
 the BPI-R4 Pro, Sud and Nord nodes. The dedicated luci-app-otb-ports
 dependency owns the global physical-port, LACP and effective-VLAN view. The
 common luci-app-otb-overview package owns the read-only overview. The collector
 never changes network, Wi-Fi, bridge, VLAN, DSA or firewall configuration.
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
endef

define Package/luci-app-otb-clients/postinst
#!/bin/sh
[ -n "$${IPKG_INSTROOT}" ] || {
	# Retire the former mutable Pro dashboard. Its monitoring data is now
	# exposed by luci-app-otb-overview through read-only ubus RPC methods.
	/etc/init.d/otb-luci-restore stop >/dev/null 2>&1 || true
	/etc/init.d/otb-luci-restore disable >/dev/null 2>&1 || true
	rm -rf /usr/share/otb-luci-overrides/r4pro
	rm -f \
		/etc/init.d/otb-luci-restore \
		/usr/sbin/otb-luci-status \
		/usr/sbin/otb-luci-wan-restart \
		/usr/sbin/otb-refresh-luci-json \
		/usr/share/rpcd/acl.d/otb-luci-status.json \
		/www/luci-static/resources/view/status/include/92_otb_status.js \
		/www/cgi-bin/otb-device-add \
		/www/cgi-bin/otb-device-del \
		/www/cgi-bin/otb-wan-restart \
		/www/cgi-bin/otb-status-json \
		/www/otb-status.json
	rm -f /tmp/luci-indexcache /tmp/luci-modulecache/* 2>/dev/null || true
}
exit 0
endef

$(eval $(call BuildPackage,luci-app-otb-clients))
