include $(TOPDIR)/rules.mk

PKG_NAME:=otb-fan-curve
PKG_VERSION:=1.1.0
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
 Applies guarded board-specific pwm-fan trip points on the supported BPI-R4
 and BPI-R4 Pro boards. The less efficiently ventilated BPI-R4 Sud uses
 earlier 55/65 degree Celsius thresholds. Stopping the service restores the
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
	$(INSTALL_DIR) $(1)/etc/uci-defaults
	$(INSTALL_BIN) ./files/etc/uci-defaults/94-otb-fan-profiles-v2 $(1)/etc/uci-defaults/94-otb-fan-profiles-v2
endef

$(eval $(call BuildPackage,otb-fan-curve))
