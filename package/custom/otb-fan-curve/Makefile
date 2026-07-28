include $(TOPDIR)/rules.mk

PKG_NAME:=otb-fan-curve
PKG_VERSION:=1.0.0
PKG_RELEASE:=1
PKG_LICENSE:=GPL-2.0-only
PKG_MAINTAINER:=OTB
PKGARCH:=all

include $(INCLUDE_DIR)/package.mk

define Package/otb-fan-curve
  SECTION:=utils
  CATEGORY:=Utilities
  TITLE:=OTB early fan curve for BPI-R4 and BPI-R4 Pro
  DEPENDS:=@TARGET_mediatek_filogic
endef

define Package/otb-fan-curve/description
 Applies the guarded 60/68 degree Celsius pwm-fan trip points on the
 supported BPI-R4 and BPI-R4 Pro boards. Stopping the service restores the
 original OpenWrt trip points.
endef

define Package/otb-fan-curve/conffiles
/etc/config/otb-fan
endef

define Build/Compile
endef

define Package/otb-fan-curve/install
	$(INSTALL_DIR) $(1)/etc/config
	$(INSTALL_CONF) ./files/etc/config/otb-fan $(1)/etc/config/otb-fan
	$(INSTALL_DIR) $(1)/etc/init.d
	$(INSTALL_BIN) ./files/etc/init.d/otb-fan-curve $(1)/etc/init.d/otb-fan-curve
endef

$(eval $(call BuildPackage,otb-fan-curve))
