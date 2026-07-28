include $(TOPDIR)/rules.mk

PKG_NAME:=otb-upgrade
PKG_VERSION:=1.0.0
PKG_RELEASE:=27
PKG_LICENSE:=Apache-2.0
PKG_MAINTAINER:=OTB
PKGARCH:=all

include $(INCLUDE_DIR)/package.mk

define Package/otb-upgrade
  SECTION:=admin
  CATEGORY:=Administration
  TITLE:=OTB signed firmware update client
  DEPENDS:=+jsonfilter +uclient-fetch +usign
endef

define Package/otb-upgrade/description
 Signed, board-checked and sequence-protected OpenWrt firmware updater for the
 OTB R4 Pro and R4 Sud. Automatic installation uses the local firmware server,
 verifies the usign manifest, image size, SHA-256 and sysupgrade compatibility.
 It never rewrites the preserved wireless configuration during installation.
endef

define Package/otb-upgrade/conffiles
/etc/config/otb-upgrade
endef

define Build/Compile
endef

define Package/otb-upgrade/install
	$(INSTALL_DIR) $(1)/etc/config
	$(INSTALL_CONF) ./files/etc/config/otb-upgrade $(1)/etc/config/otb-upgrade
	$(INSTALL_DIR) $(1)/etc/otb-upgrade
	$(INSTALL_DATA) ./files/etc/otb-upgrade/otb-firmware.pub $(1)/etc/otb-upgrade/otb-firmware.pub
	$(INSTALL_DATA) ./files/etc/otb-release $(1)/etc/otb-release
	$(INSTALL_DIR) $(1)/etc/uci-defaults
	$(INSTALL_BIN) ./files/etc/uci-defaults/99-otb-upgrade $(1)/etc/uci-defaults/99-otb-upgrade
	$(INSTALL_DIR) $(1)/usr/sbin
	$(INSTALL_BIN) ./files/usr/sbin/otb-upgrade $(1)/usr/sbin/otb-upgrade
endef

$(eval $(call BuildPackage,otb-upgrade))
