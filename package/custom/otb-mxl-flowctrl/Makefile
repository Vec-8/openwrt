include $(TOPDIR)/rules.mk

PKG_NAME:=otb-mxl-flowctrl
PKG_VERSION:=1.0.0
PKG_RELEASE:=2
PKG_LICENSE:=GPL-2.0-only
PKG_MAINTAINER:=OTB
PKGARCH:=all

include $(INCLUDE_DIR)/package.mk

define Package/otb-mxl-flowctrl
  SECTION:=net
  CATEGORY:=Network
  TITLE:=OTB guarded MxL862xx TX PAUSE policy
  DEPENDS:=@TARGET_mediatek_filogic +ethtool-full +kmod-dsa-mxl862xx +luci-app-commands
endef

define Package/otb-mxl-flowctrl/description
 Installs the guarded and reversible OTB flow-control policy for the
 BPI-R4 Pro MxL862xx trunk member mxl_lan5. The package is disabled by
 default, never edits UCI network, VLAN, bridge, bond, firewall or wireless
 configuration, and refuses to run without the matching patched driver.
endef

define Package/otb-mxl-flowctrl/conffiles
/etc/config/otb_mxl_flowctrl
endef

define Build/Compile
endef

define Package/otb-mxl-flowctrl/install
	$(INSTALL_DIR) $(1)/etc/config
	$(INSTALL_CONF) ./files/etc/config/otb_mxl_flowctrl $(1)/etc/config/otb_mxl_flowctrl
	$(INSTALL_DIR) $(1)/etc/init.d
	$(INSTALL_BIN) ./files/etc/init.d/otb-mxl-flowctrl $(1)/etc/init.d/otb-mxl-flowctrl
	$(INSTALL_DIR) $(1)/etc/hotplug.d/iface
	$(INSTALL_BIN) ./files/etc/hotplug.d/iface/99-otb-mxl-flowctrl $(1)/etc/hotplug.d/iface/99-otb-mxl-flowctrl
	$(INSTALL_DIR) $(1)/etc/uci-defaults
	$(INSTALL_BIN) ./files/etc/uci-defaults/96-otb-mxl-flowctrl-luci $(1)/etc/uci-defaults/96-otb-mxl-flowctrl-luci
	$(INSTALL_DIR) $(1)/usr/libexec
	$(INSTALL_BIN) ./files/usr/libexec/otb-mxl-flowctrl $(1)/usr/libexec/otb-mxl-flowctrl
endef

$(eval $(call BuildPackage,otb-mxl-flowctrl))
