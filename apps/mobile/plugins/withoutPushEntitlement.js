/**
 * Weekwell only schedules local reminders (D-047); it never receives push
 * notifications. expo-notifications adds the `aps-environment` entitlement by
 * default, which would need a push-enabled provisioning profile, so remove it.
 * Listed first in app.json: mods run in reverse order, so this one runs last.
 */
const { withEntitlementsPlist } = require('expo/config-plugins');

module.exports = function withoutPushEntitlement(config) {
  return withEntitlementsPlist(config, (cfg) => {
    delete cfg.modResults['aps-environment'];
    return cfg;
  });
};
