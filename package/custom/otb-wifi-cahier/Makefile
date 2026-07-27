include $(TOPDIR)/rules.mk

PKG_NAME:=otb-wifi-cahier
PKG_VERSION:=3.0.2
PKG_RELEASE:=1
PKG_LICENSE:=Apache-2.0
PKG_MAINTAINER:=OTB
PKGARCH:=all

include $(INCLUDE_DIR)/package.mk

define Package/otb-wifi-cahier
  SECTION:=net
  CATEGORY:=Network
  TITLE:=OTB passive Wi-Fi MLO policy audit
  DEPENDS:=+uci
endef

define Package/otb-wifi-cahier/description
 Passive audit of the OTB Wi-Fi policy. It never changes wireless UCI and
 never reloads a radio. The expected layout is three MLO groups backed by the
 single BE14 card through its two PCIe functions, plus the dedicated Home-2G
 BSS outside MLO.
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
