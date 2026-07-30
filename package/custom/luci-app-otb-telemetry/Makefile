include $(TOPDIR)/rules.mk

PKG_NAME:=luci-app-otb-telemetry
PKG_VERSION:=1.0.0
PKG_RELEASE:=2
PKG_LICENSE:=Apache-2.0
PKG_MAINTAINER:=OTB R4 Development <otb-r4@users.noreply.github.com>

include $(INCLUDE_DIR)/package.mk

define Package/luci-app-otb-telemetry
  SECTION:=luci
  CATEGORY:=LuCI
  SUBMENU:=3. Applications
  TITLE:=OTB unified read-only hardware telemetry
  DEPENDS:=+luci-base +rpcd +ucode +ucode-mod-fs +ethtool-full
  PKGARCH:=all
endef

define Package/luci-app-otb-telemetry/description
 Read-only LuCI telemetry for OTB OpenWrt nodes. It reports thermal zones,
 hardware-monitor temperatures, PWM and cooling states, CPU frequencies and
 SFP/SFP+ DDM values with their native thresholds and alarm flags. The 24-hour
 history is kept only in RAM and no network setting is modified.
endef

define Build/Compile
endef

define Package/luci-app-otb-telemetry/install
	$(INSTALL_DIR) $(1)/etc/init.d
	$(INSTALL_BIN) ./root/etc/init.d/otb-telemetry \
		$(1)/etc/init.d/otb-telemetry
	$(INSTALL_DIR) $(1)/usr/sbin
	$(INSTALL_BIN) ./root/usr/sbin/otb-telemetry-recorder \
		$(1)/usr/sbin/otb-telemetry-recorder
	$(INSTALL_DIR) $(1)/usr/share/rpcd/ucode
	$(INSTALL_DATA) ./root/usr/share/rpcd/ucode/luci.otb_telemetry \
		$(1)/usr/share/rpcd/ucode/luci.otb_telemetry
	$(INSTALL_DIR) $(1)/usr/share/rpcd/acl.d
	$(INSTALL_DATA) ./root/usr/share/rpcd/acl.d/luci-app-otb-telemetry.json \
		$(1)/usr/share/rpcd/acl.d/luci-app-otb-telemetry.json
	$(INSTALL_DIR) $(1)/usr/share/luci/menu.d
	$(INSTALL_DATA) ./root/usr/share/luci/menu.d/luci-app-otb-telemetry.json \
		$(1)/usr/share/luci/menu.d/luci-app-otb-telemetry.json
	$(INSTALL_DIR) $(1)/www/luci-static/resources/view/status
	$(INSTALL_DATA) ./htdocs/luci-static/resources/view/status/otb-telemetry.js \
		$(1)/www/luci-static/resources/view/status/otb-telemetry.js
endef

define Package/luci-app-otb-telemetry/postinst
#!/bin/sh
[ -n "$${IPKG_INSTROOT}" ] || {
	/etc/init.d/otb-telemetry enable >/dev/null 2>&1 || true
	if /etc/init.d/otb-telemetry running >/dev/null 2>&1; then
		/etc/init.d/otb-telemetry restart >/dev/null 2>&1 || true
	else
		/etc/init.d/otb-telemetry start >/dev/null 2>&1 || true
	fi
	/etc/init.d/rpcd restart >/dev/null 2>&1 || true
	rm -f /tmp/luci-indexcache /tmp/luci-modulecache/* 2>/dev/null || true
}
exit 0
endef

define Package/luci-app-otb-telemetry/prerm
#!/bin/sh
[ -n "$${IPKG_INSTROOT}" ] || {
	/etc/init.d/otb-telemetry stop >/dev/null 2>&1 || true
	/etc/init.d/otb-telemetry disable >/dev/null 2>&1 || true
}
exit 0
endef

$(eval $(call BuildPackage,luci-app-otb-telemetry))
