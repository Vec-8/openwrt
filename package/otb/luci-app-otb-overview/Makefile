include $(TOPDIR)/rules.mk

PKG_NAME:=luci-app-otb-overview
PKG_VERSION:=1.0.0
PKG_RELEASE:=1
PKG_LICENSE:=Apache-2.0
PKG_MAINTAINER:=OTB R4 Development <otb-r4@users.noreply.github.com>

include $(INCLUDE_DIR)/package.mk

define Package/luci-app-otb-overview
  SECTION:=luci
  CATEGORY:=LuCI
  SUBMENU:=3. Applications
  TITLE:=OTB role-aware read-only system overview
  DEPENDS:=+luci-base +rpcd +ucode +ucode-mod-fs +jshn
  PKGARCH:=all
endef

define Package/luci-app-otb-overview/description
 A common, role-aware and read-only LuCI overview for the OTB R4 Pro, R4
 access points and OpenWrt core switches. It consolidates health, LACP,
 effective VLAN, Wi-Fi/MLO, WAN, container and named static-IP supervision
 without changing network state. The detailed physical-port view provided by
 luci-app-otb-ports remains installed and visible.
endef

define Package/luci-app-otb-overview/conffiles
/etc/config/otb-overview
endef

define Build/Compile
endef

define Package/luci-app-otb-overview/install
	$(INSTALL_DIR) $(1)/etc/config
	$(INSTALL_CONF) ./root/etc/config/otb-overview \
		$(1)/etc/config/otb-overview
	$(INSTALL_DIR) $(1)/etc/init.d
	$(INSTALL_BIN) ./root/etc/init.d/otb-overview \
		$(1)/etc/init.d/otb-overview
	$(INSTALL_DIR) $(1)/usr/sbin
	$(INSTALL_BIN) ./root/usr/sbin/otb-overview-loop \
		$(1)/usr/sbin/otb-overview-loop
	$(INSTALL_BIN) ./root/usr/sbin/otb-overview-snapshot \
		$(1)/usr/sbin/otb-overview-snapshot
	$(INSTALL_DIR) $(1)/usr/share/rpcd/ucode
	$(INSTALL_DATA) ./root/usr/share/rpcd/ucode/luci.otb_overview \
		$(1)/usr/share/rpcd/ucode/luci.otb_overview
	$(INSTALL_DIR) $(1)/usr/share/rpcd/acl.d
	$(INSTALL_DATA) ./root/usr/share/rpcd/acl.d/luci-app-otb-overview.json \
		$(1)/usr/share/rpcd/acl.d/luci-app-otb-overview.json
	$(INSTALL_DIR) $(1)/www/luci-static/resources/view/status/include
	$(INSTALL_DATA) ./htdocs/luci-static/resources/view/status/include/05_otb_overview.js \
		$(1)/www/luci-static/resources/view/status/include/05_otb_overview.js
endef

define Package/luci-app-otb-overview/postinst
#!/bin/sh
[ -n "$${IPKG_INSTROOT}" ] || {
	# The former Pro dashboard exposed mutating CGI actions from the status
	# page. Keep its data/configuration but retire the obsolete UI and CGI
	# entry points in favour of this read-only RPC view.
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

	/etc/init.d/otb-overview enable >/dev/null 2>&1 || true
	if /etc/init.d/otb-overview running >/dev/null 2>&1; then
		/etc/init.d/otb-overview restart >/dev/null 2>&1 || true
	else
		/etc/init.d/otb-overview start >/dev/null 2>&1 || true
	fi
	/etc/init.d/rpcd restart >/dev/null 2>&1 || true
	rm -f /tmp/luci-indexcache /tmp/luci-modulecache/* 2>/dev/null || true
}
exit 0
endef

define Package/luci-app-otb-overview/prerm
#!/bin/sh
[ -n "$${IPKG_INSTROOT}" ] || {
	/etc/init.d/otb-overview stop >/dev/null 2>&1 || true
	/etc/init.d/otb-overview disable >/dev/null 2>&1 || true
}
exit 0
endef

$(eval $(call BuildPackage,luci-app-otb-overview))
