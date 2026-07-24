include $(TOPDIR)/rules.mk

PKG_NAME:=otb-wifi-cahier
PKG_VERSION:=1.1.0
PKG_RELEASE:=1
PKG_LICENSE:=Apache-2.0
PKG_MAINTAINER:=OTB
PKGARCH:=all

include $(INCLUDE_DIR)/package.mk

define Package/otb-wifi-cahier
  SECTION:=net
  CATEGORY:=Network
  TITLE:=OTB Wi-Fi MLO cahier des charges migration
  DEPENDS:=+uci +iw
endef

define Package/otb-wifi-cahier/description
 Migrates legacy OTB wifi-mld sections to the OpenWrt 25.12 multi-device
 wifi-iface MLO schema. Existing SSIDs, secrets, channels, country and VLAN
 network names are preserved; only the required 40/160/320 MHz widths and
 exact OTB MLO/security profiles are enforced. A boot guard verifies the
 effective radio links after DFS/CAC and retries only incomplete radios.
endef

define Build/Compile
endef

define Package/otb-wifi-cahier/install
	$(INSTALL_DIR) $(1)/usr/sbin
	$(INSTALL_BIN) ./files/usr/sbin/otb-wifi-cahier-migrate $(1)/usr/sbin/otb-wifi-cahier-migrate
	$(INSTALL_BIN) ./files/usr/sbin/otb-wifi-cahier-guard $(1)/usr/sbin/otb-wifi-cahier-guard
	$(INSTALL_DIR) $(1)/etc/init.d
	$(INSTALL_BIN) ./files/etc/init.d/otb-wifi-cahier-guard $(1)/etc/init.d/otb-wifi-cahier-guard
	$(INSTALL_DIR) $(1)/etc/uci-defaults
	$(INSTALL_BIN) ./files/etc/uci-defaults/98-otb-wifi-cahier $(1)/etc/uci-defaults/98-otb-wifi-cahier
	$(INSTALL_DIR) $(1)/usr/share/doc/otb-wifi-cahier
	$(INSTALL_DATA) ./files/README $(1)/usr/share/doc/otb-wifi-cahier/README
endef

$(eval $(call BuildPackage,otb-wifi-cahier))
