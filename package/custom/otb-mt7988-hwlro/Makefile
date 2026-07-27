include $(TOPDIR)/rules.mk

PKG_NAME:=otb-mt7988-hwlro
PKG_VERSION:=1.2.0
PKG_RELEASE:=1
PKG_LICENSE:=GPL-2.0-only
PKG_MAINTAINER:=OTB
PKGARCH:=all

include $(INCLUDE_DIR)/package.mk

define Package/otb-mt7988-hwlro
  SECTION:=net
  CATEGORY:=Network
  TITLE:=OTB guarded MT7988 hardware LRO setup
  DEPENDS:=@TARGET_mediatek_filogic +ethtool-full +luci-app-commands
endef

define Package/otb-mt7988-hwlro/description
 Installs a guarded and reversible MT7988 hardware-LRO setup for the OTB
 2x10G LACP paths. It never changes UCI network, VLAN, bridge, bond, firewall
 or wireless configuration. Exact-DIP filtered mode remains disabled until it
 has been validated manually on the R4 Sud.
endef

define Package/otb-mt7988-hwlro/conffiles
/etc/config/otb_hwlro
endef

define Build/Compile
endef

define Package/otb-mt7988-hwlro/install
	$(INSTALL_DIR) $(1)/etc/config
	$(INSTALL_CONF) ./files/etc/config/otb_hwlro $(1)/etc/config/otb_hwlro
	$(INSTALL_DIR) $(1)/etc/init.d
	$(INSTALL_BIN) ./files/etc/init.d/otb-mt7988-hwlro $(1)/etc/init.d/otb-mt7988-hwlro
	$(INSTALL_DIR) $(1)/etc/hotplug.d/iface
	$(INSTALL_BIN) ./files/etc/hotplug.d/iface/99-otb-mt7988-hwlro $(1)/etc/hotplug.d/iface/99-otb-mt7988-hwlro
	$(INSTALL_DIR) $(1)/etc/uci-defaults
	$(INSTALL_BIN) ./files/etc/uci-defaults/97-otb-mt7988-hwlro-luci $(1)/etc/uci-defaults/97-otb-mt7988-hwlro-luci
	$(INSTALL_DIR) $(1)/usr/libexec
	$(INSTALL_BIN) ./files/usr/libexec/otb-mt7988-hwlro $(1)/usr/libexec/otb-mt7988-hwlro
endef

$(eval $(call BuildPackage,otb-mt7988-hwlro))
