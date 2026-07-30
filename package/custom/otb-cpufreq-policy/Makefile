include $(TOPDIR)/rules.mk

PKG_NAME:=otb-cpufreq-policy
PKG_VERSION:=1.3.0
PKG_RELEASE:=1
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
 Uses schedutil at idle and temporarily raises the MT7988 minimum to 1.8 GHz
 under sustained CPU or bond traffic. Thermal caps always take priority. The
 BPI-R4 and BPI-R4 Pro share the same 70/65 degree Celsius thermal cap and
 85/78 degree Celsius emergency cap profile.
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
	$(INSTALL_BIN) ./files/etc/uci-defaults/97-otb-cpufreq-loadboost-v3 $(1)/etc/uci-defaults/97-otb-cpufreq-loadboost-v3
	$(INSTALL_DIR) $(1)/usr/sbin
	$(INSTALL_BIN) ./files/usr/sbin/otb-cpufreqd $(1)/usr/sbin/otb-cpufreqd
	$(INSTALL_BIN) ./files/usr/sbin/otb-cpufreq-status $(1)/usr/sbin/otb-cpufreq-status
endef

$(eval $(call BuildPackage,otb-cpufreq-policy))
