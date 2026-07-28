include $(TOPDIR)/rules.mk

PKG_NAME:=otb-cpufreq-policy
PKG_VERSION:=1.2.0
PKG_RELEASE:=2
PKG_LICENSE:=Apache-2.0
PKG_MAINTAINER:=OTB
PKGARCH:=all

include $(INCLUDE_DIR)/package.mk

define Package/otb-cpufreq-policy
  SECTION:=utils
  CATEGORY:=Utilities
  TITLE:=OTB dynamic MT7988 CPU frequency and thermal policy
endef

define Package/otb-cpufreq-policy/description
 Uses the kernel schedutil governor to scale MT7988 CPUs between 800 MHz and
 1.8 GHz according to load, with board-specific thermal caps. The less
 efficiently ventilated BPI-R4 Sud is capped earlier and can fall back to
 800 MHz above 75 degrees Celsius.
endef

define Package/otb-cpufreq-policy/conffiles
/etc/config/otb-cpufreq
endef

define Build/Compile
endef

define Package/otb-cpufreq-policy/install
	$(INSTALL_DIR) $(1)/etc/config
	$(INSTALL_CONF) ./files/etc/config/otb-cpufreq $(1)/etc/config/otb-cpufreq
	$(INSTALL_DIR) $(1)/etc/init.d
	$(INSTALL_BIN) ./files/etc/init.d/otb-cpufreq $(1)/etc/init.d/otb-cpufreq
	$(INSTALL_DIR) $(1)/etc/uci-defaults
	$(INSTALL_BIN) ./files/etc/uci-defaults/95-otb-cpufreq $(1)/etc/uci-defaults/95-otb-cpufreq
	$(INSTALL_BIN) ./files/etc/uci-defaults/96-otb-cpufreq-profiles-v2 $(1)/etc/uci-defaults/96-otb-cpufreq-profiles-v2
	$(INSTALL_DIR) $(1)/usr/sbin
	$(INSTALL_BIN) ./files/usr/sbin/otb-cpufreqd $(1)/usr/sbin/otb-cpufreqd
	$(INSTALL_BIN) ./files/usr/sbin/otb-cpufreq-status $(1)/usr/sbin/otb-cpufreq-status
endef

$(eval $(call BuildPackage,otb-cpufreq-policy))
