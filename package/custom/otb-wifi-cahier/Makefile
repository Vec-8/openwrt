include $(TOPDIR)/rules.mk

PKG_NAME:=otb-wifi-cahier
PKG_VERSION:=2.0.0
PKG_RELEASE:=1
PKG_LICENSE:=Apache-2.0
PKG_MAINTAINER:=OTB
PKGARCH:=all

include $(INCLUDE_DIR)/package.mk

define Package/otb-wifi-cahier
  SECTION:=net
  CATEGORY:=Network
  TITLE:=OTB passive Wi-Fi per-radio policy audit
  DEPENDS:=+uci
endef

define Package/otb-wifi-cahier/description
 Passive audit of the OTB Wi-Fi policy. It never changes wireless UCI,
 reloads a radio or converts a configuration to MLO. The R4 Pro policy is one
 independent wifi-iface per radio with MLO disabled.
endef

define Build/Compile
endef

define Package/otb-wifi-cahier/install
	$(INSTALL_DIR) $(1)/usr/sbin
	$(INSTALL_BIN) ./files/usr/sbin/otb-wifi-cahier-audit $(1)/usr/sbin/otb-wifi-cahier-audit
	$(INSTALL_DIR) $(1)/usr/share/doc/otb-wifi-cahier
	$(INSTALL_DATA) ./files/README $(1)/usr/share/doc/otb-wifi-cahier/README
endef

$(eval $(call BuildPackage,otb-wifi-cahier))
