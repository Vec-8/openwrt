include $(TOPDIR)/rules.mk

PKG_NAME:=otb-mt7988-rss-tuning
PKG_VERSION:=1.0.0
PKG_RELEASE:=1
PKG_LICENSE:=GPL-2.0-only
PKG_MAINTAINER:=OTB
PKGARCH:=all

include $(INCLUDE_DIR)/package.mk

define Package/otb-mt7988-rss-tuning
  SECTION:=net
  CATEGORY:=Network
  TITLE:=OTB MT7988 RSS IRQ and NAPI steering override
  DEPENDS:=@TARGET_mediatek_filogic
endef

define Package/otb-mt7988-rss-tuning/description
 Preserves OpenWrt packet steering for Wi-Fi and other devices, then applies
 the MT7988 hardware-RSS mapping required by the four Ethernet RX rings. It
 changes runtime CPU affinity only and never modifies UCI, VLAN, bridge, bond,
 firewall or wireless configuration.
endef

define Build/Compile
endef

define Package/otb-mt7988-rss-tuning/install
	$(INSTALL_DIR) $(1)/usr/libexec/platform
	$(INSTALL_BIN) ./files/packet-steering.sh $(1)/usr/libexec/platform/packet-steering.sh
endef

$(eval $(call BuildPackage,otb-mt7988-rss-tuning))
