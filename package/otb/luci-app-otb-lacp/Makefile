include $(TOPDIR)/rules.mk

LUCI_TITLE:=LuCI read-only LACP, VLAN and thermal status
LUCI_DEPENDS:=+luci-base +luci-mod-network +kmod-bonding +ip-full +ip-bridge +ethtool-full
LUCI_PKGARCH:=all

PKG_LICENSE:=Apache-2.0
PKG_MAINTAINER:=OTB R4 Development <otb-r4@users.noreply.github.com>

include $(TOPDIR)/feeds/luci/luci.mk

# call BuildPackage - OpenWrt buildroot signature
