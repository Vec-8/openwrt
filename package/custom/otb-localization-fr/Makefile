include $(TOPDIR)/rules.mk

PKG_NAME:=otb-localization-fr
PKG_VERSION:=1.0.0
PKG_RELEASE:=1
PKG_LICENSE:=GPL-2.0-only
PKG_MAINTAINER:=OTB
PKGARCH:=all

include $(INCLUDE_DIR)/package.mk

define Package/otb-localization-fr
  SECTION:=luci
  CATEGORY:=LuCI
  TITLE:=OTB French LuCI defaults
  DEPENDS:=+luci-base +luci-i18n-base-fr
endef

define Package/otb-localization-fr/description
 Installs the French LuCI catalogue and selects French as the interface
 language without changing network, wireless, firewall or service settings.
endef

define Build/Compile
endef

define Package/otb-localization-fr/install
	$(INSTALL_DIR) $(1)/etc/uci-defaults
	$(INSTALL_BIN) ./files/etc/uci-defaults/98-otb-localization-fr \
		$(1)/etc/uci-defaults/98-otb-localization-fr
endef

$(eval $(call BuildPackage,otb-localization-fr))
