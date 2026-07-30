include $(TOPDIR)/rules.mk

PKG_NAME:=otb-firmware-mirror
PKG_VERSION:=1.0.0
PKG_RELEASE:=1
PKG_LICENSE:=Apache-2.0
PKGARCH:=all

include $(INCLUDE_DIR)/package.mk

define Package/otb-firmware-mirror
  SECTION:=utils
  CATEGORY:=Utilities
  TITLE:=Local signed firmware mirror for OTB upgrades
  DEPENDS:=+uhttpd +uclient-fetch +jsonfilter
endef

define Package/otb-firmware-mirror/description
 Serves a provisioned OTB signed firmware tree on loopback. It never publishes
 or signs an image and remains disabled until a valid mirror is provisioned.
endef

define Package/otb-firmware-mirror/conffiles
/etc/config/otb-firmware-mirror
endef

define Build/Compile
endef

define Package/otb-firmware-mirror/install
	$(INSTALL_DIR) $(1)/etc/config
	$(INSTALL_CONF) ./files/etc/config/otb-firmware-mirror \
		$(1)/etc/config/otb-firmware-mirror
	$(INSTALL_DIR) $(1)/etc/init.d
	$(INSTALL_BIN) ./files/etc/init.d/otb-firmware-mirror \
		$(1)/etc/init.d/otb-firmware-mirror
	$(INSTALL_DIR) $(1)/usr/sbin
	$(INSTALL_BIN) ./files/usr/sbin/otb-firmware-mirror-status \
		$(1)/usr/sbin/otb-firmware-mirror-status
endef

$(eval $(call BuildPackage,otb-firmware-mirror))
