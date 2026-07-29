include $(TOPDIR)/rules.mk

PKG_NAME:=r4sud-ha-policy
PKG_VERSION:=1.1.0
PKG_RELEASE:=6
PKG_LICENSE:=GPL-2.0-only
PKGARCH:=all

include $(INCLUDE_DIR)/package.mk

define Package/r4sud-ha-policy
  SECTION:=utils
  CATEGORY:=Utilities
  TITLE:=OTB R4 Sud safe Home Assistant container prerequisites
  DEPENDS:=@TARGET_mediatek_filogic \
    +docker +dockerd +docker-compose +kmod-ipvlan \
    +block-mount +kmod-fs-ext4 +kmod-fs-f2fs +f2fs-tools \
    +e2fsprogs +resize2fs +tune2fs +e2freefrag \
    +lsblk +blkid +blockdev +mount-utils +fdisk +parted \
    +bash +ca-bundle +ca-certificates +curl +wget-ssl +jq +gzip \
    +htop +coreutils-nohup
endef

define Package/r4sud-ha-policy/description
 Installs the container prerequisites for Home Assistant on R4 Sud. Dockerd
 starts only when /srv is a distinct persistent filesystem and the explicit
 storage-ready marker exists; a valid existing ext4 or f2fs /srv is supported.
 It never creates or changes network, bridge, VLAN or firewall configuration.
endef

define Build/Compile
endef

define Package/r4sud-ha-policy/install
	$(INSTALL_DIR) $(1)/etc/r4sud-build
	$(INSTALL_DATA) ./files/BUILDINFO $(1)/etc/r4sud-build/BUILDINFO
	$(INSTALL_DATA) ./files/README $(1)/etc/r4sud-build/README
	$(INSTALL_DIR) $(1)/usr/libexec/r4sud-ha-policy
	$(INSTALL_BIN) ./files/dockerd.init.safe $(1)/usr/libexec/r4sud-ha-policy/dockerd.init.safe
	$(INSTALL_DIR) $(1)/etc/init.d
	$(INSTALL_BIN) ./files/r4sud-ha-guard $(1)/etc/init.d/r4sud-ha-guard
	$(INSTALL_DIR) $(1)/etc/sysctl.d
	$(INSTALL_DATA) ./files/99-otb-ap-only.conf $(1)/etc/sysctl.d/99-otb-ap-only.conf
	$(INSTALL_DIR) $(1)/etc/uci-defaults
	$(INSTALL_BIN) ./files/99-r4sud-containers-safe $(1)/etc/uci-defaults/99-r4sud-containers-safe
	$(INSTALL_DIR) $(1)/usr/sbin
	$(INSTALL_BIN) ./files/r4sud-container-storage-enable $(1)/usr/sbin/r4sud-container-storage-enable
	$(INSTALL_BIN) ./files/r4sud-container-storage-disable $(1)/usr/sbin/r4sud-container-storage-disable
endef

$(eval $(call BuildPackage,r4sud-ha-policy))
