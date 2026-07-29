include $(TOPDIR)/rules.mk

PKG_NAME:=otb-wan-heal
PKG_VERSION:=1.0.0
PKG_RELEASE:=1
PKG_LICENSE:=GPL-2.0-only
PKG_MAINTAINER:=OTB
PKGARCH:=all

include $(INCLUDE_DIR)/package.mk

define Package/otb-wan-heal
  SECTION:=net
  CATEGORY:=Network
  TITLE:=OTB strict WAN detection and targeted recovery
  DEPENDS:=@TARGET_mediatek_filogic +mwan3 +curl +ca-bundle +uqmi +jsonfilter +uci
  PROVIDES:=httping
  CONFLICTS:=httping
endef

define Package/otb-wan-heal/description
 Adds strict HTTPS captive-portal detection to mwan3 for the OTB fibre and
 cellular WANs. Fibre is removed from active policies without bouncing the
 local interface; QMI WANs receive serialized, rate-limited targeted restarts.
endef

define Package/otb-wan-heal/conffiles
/etc/config/otb-wan-heal
endef

define Build/Compile
endef

define Package/otb-wan-heal/install
	$(INSTALL_DIR) $(1)/etc/config
	$(INSTALL_CONF) ./files/etc/config/otb-wan-heal $(1)/etc/config/otb-wan-heal
	$(INSTALL_DIR) $(1)/etc/init.d
	$(INSTALL_BIN) ./files/etc/init.d/otb-wan-heal $(1)/etc/init.d/otb-wan-heal
	$(INSTALL_DIR) $(1)/etc/uci-defaults
	$(INSTALL_BIN) ./files/etc/uci-defaults/95-otb-wan-heal $(1)/etc/uci-defaults/95-otb-wan-heal
	$(INSTALL_DIR) $(1)/usr/bin
	$(INSTALL_BIN) ./files/usr/bin/httping $(1)/usr/bin/httping
	$(INSTALL_BIN) ./files/usr/bin/otb-httping $(1)/usr/bin/otb-httping
	$(INSTALL_DIR) $(1)/usr/sbin
	$(INSTALL_BIN) ./files/usr/sbin/otb-wan-heal $(1)/usr/sbin/otb-wan-heal
	$(INSTALL_DIR) $(1)/usr/share/doc/otb-wan-heal
	$(INSTALL_DATA) ./README.md $(1)/usr/share/doc/otb-wan-heal/README.md
endef

$(eval $(call BuildPackage,otb-wan-heal))
