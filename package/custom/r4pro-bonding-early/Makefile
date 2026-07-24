include $(TOPDIR)/rules.mk

PKG_NAME:=r4pro-bonding-early
PKG_VERSION:=1
PKG_RELEASE:=1
PKG_LICENSE:=GPL-2.0-only
PKGARCH:=all

include $(INCLUDE_DIR)/package.mk

define Package/r4pro-bonding-early
  SECTION:=base
  CATEGORY:=Base system
  TITLE:=BPI-R4 Pro early 802.3ad bonding defaults
  DEPENDS:=@TARGET_mediatek_filogic +kmod-bonding
endef

define Package/r4pro-bonding-early/description
 Loads the bonding module with the tested 802.3ad defaults before netifd creates
 bond-trunk. This avoids the mode-setting race while preserving UCI ownership.
endef

define Build/Compile
endef

define Package/r4pro-bonding-early/install
	$(INSTALL_DIR) $(1)/etc/modules.d
	$(INSTALL_DATA) ./files/39-r4pro-bonding $(1)/etc/modules.d/39-r4pro-bonding
endef

$(eval $(call BuildPackage,r4pro-bonding-early))
