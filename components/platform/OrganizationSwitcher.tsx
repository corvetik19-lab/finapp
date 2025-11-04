"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./OrganizationSwitcher.module.css";

interface Organization {
  id: string;
  name: string;
  slug: string;
  subscription_plan: string;
}

interface OrganizationSwitcherProps {
  currentOrganization: Organization;
  organizations?: Organization[];
}

export default function OrganizationSwitcher({
  currentOrganization,
  organizations = [],
}: OrganizationSwitcherProps) {
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();

  const handleSwitch = async (orgId: string) => {
    // TODO: API call to switch organization
    console.log("Switching to org:", orgId);
    setIsOpen(false);
    router.refresh();
  };

  const planBadges: Record<string, { label: string; color: string }> = {
    free: { label: "Free", color: "#6c757d" },
    pro: { label: "Pro", color: "#6366f1" },
    enterprise: { label: "Enterprise", color: "#10b981" },
  };

  return (
    <div className={styles.orgSwitcher}>
      <button
        className={styles.orgButton}
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Переключить организацию"
      >
        <span className="material-icons">business</span>
        <span className={styles.orgName}>{currentOrganization.name}</span>
        <span className="material-icons">
          {isOpen ? "expand_less" : "expand_more"}
        </span>
      </button>

      {isOpen && (
        <>
          <div
            className={styles.orgOverlay}
            onClick={() => setIsOpen(false)}
          />
          <div className={styles.orgDropdown}>
            <div className={styles.orgHeader}>
              <h3>Организации</h3>
              <p>Переключение между рабочими пространствами</p>
            </div>

            <div className={styles.orgList}>
              {organizations.map((org) => {
                const isActive = org.id === currentOrganization.id;
                const planInfo = planBadges[org.subscription_plan] || planBadges.free;

                return (
                  <button
                    key={org.id}
                    className={`${styles.orgItem} ${
                      isActive ? styles.orgItemActive : ""
                    }`}
                    onClick={() => handleSwitch(org.id)}
                    disabled={isActive}
                  >
                    <div className={styles.orgItemIcon}>
                      <span className="material-icons">business</span>
                    </div>
                    <div className={styles.orgItemContent}>
                      <div className={styles.orgItemName}>{org.name}</div>
                      <div className={styles.orgItemSlug}>@{org.slug}</div>
                    </div>
                    <div className={styles.orgItemBadge}>
                      <span
                        className={styles.planBadge}
                        style={{ background: `${planInfo.color}20`, color: planInfo.color }}
                      >
                        {planInfo.label}
                      </span>
                      {isActive && (
                        <span className="material-icons" style={{ color: "#10b981" }}>
                          check_circle
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            <div className={styles.orgFooter}>
              <button
                className={styles.createOrgButton}
                onClick={() => {
                  setIsOpen(false);
                  router.push("/settings/organization/new");
                }}
              >
                <span className="material-icons">add_circle</span>
                Создать организацию
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
