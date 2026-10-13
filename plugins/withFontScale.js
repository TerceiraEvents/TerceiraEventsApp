const { withAndroidManifest } = require('expo/config-plugins');

/** Handles fontScale configuration updates within the existing Android Activity. */
module.exports = function withFontScale(config) {
  return withAndroidManifest(config, (result) => {
    const activity = result.modResults.manifest.application[0].activity.find((entry) => entry.$['android:name'] === '.MainActivity');
    if (!activity) throw new Error('MainActivity is required for fontScale handling');
    const changes = new Set((activity.$['android:configChanges'] || '').split('|').filter(Boolean));
    changes.add('fontScale');
    activity.$['android:configChanges'] = [...changes].join('|');
    return result;
  });
};
