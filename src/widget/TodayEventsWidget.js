import React from 'react';
import {
  FlexWidget,
  TextWidget,
  ListWidget,
} from 'react-native-android-widget';

import { t, getLocale } from '../i18n/core.js';
import { localizedField } from '../utils/i18nFields.js';

const BRAND_GREEN = '#2d5016';
const BRAND_GREEN_LIGHT = '#4a7a2e';
const ACCENT_GOLD = '#c8a84e';
const WHITE = '#ffffff';
const TEXT_LIGHT = '#666666';

function formatTodayDate() {
  const now = new Date();
  const options = { weekday: 'long', month: 'long', day: 'numeric' };
  const tag = getLocale() === 'pt' ? 'pt-PT' : 'en-US';
  return now.toLocaleDateString(tag, options);
}

function EventRow({ event, isLast }) {
  const locale = getLocale();
  const name = localizedField(event, 'name', locale) || '';
  const venueText = localizedField(event, 'venue', locale) || '';
  const timeText = event.time || '';
  const detailParts = [timeText, venueText].filter(Boolean).join(' \u2022 ');

  return (
    <FlexWidget
      style={{
        flexDirection: 'column',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderBottomWidth: isLast ? 0 : 1,
        borderBottomColor: '#e8e4d8',
      }}
      clickAction="OPEN_APP"
    >
      <TextWidget
        text={name}
        style={{
          fontSize: 14,
          fontWeight: 'bold',
          color: '#2c2c2c',
        }}
        maxLines={1}
      />
      {detailParts.length > 0 && (
        <TextWidget
          text={detailParts}
          style={{
            fontSize: 12,
            color: TEXT_LIGHT,
            marginTop: 2,
          }}
          maxLines={1}
        />
      )}
    </FlexWidget>
  );
}

function NoEventsMessage() {
  return (
    <FlexWidget
      style={{
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 16,
      }}
    >
      <TextWidget
        text={t('widget.noEvents')}
        style={{
          fontSize: 14,
          color: TEXT_LIGHT,
        }}
      />
      <TextWidget
        text={t('widget.noEventsHint')}
        style={{
          fontSize: 12,
          color: BRAND_GREEN_LIGHT,
          marginTop: 4,
        }}
      />
    </FlexWidget>
  );
}

export function TodayEventsWidget({ events = [] }) {
  const displayEvents = events.slice(0, 5);
  const hasMore = events.length > 5;

  return (
    <FlexWidget
      style={{
        flexDirection: 'column',
        width: 'match_parent',
        height: 'match_parent',
        backgroundColor: WHITE,
        borderRadius: 16,
      }}
      clickAction="OPEN_APP"
    >
      {/* Header */}
      <FlexWidget
        style={{
          flexDirection: 'column',
          width: 'match_parent',
          backgroundColor: BRAND_GREEN,
          borderRadius: 16,
          borderBottomLeftRadius: 0,
          borderBottomRightRadius: 0,
          paddingHorizontal: 16,
          paddingTop: 12,
          paddingBottom: 10,
        }}
      >
        <TextWidget
          text={t('widget.title')}
          style={{
            fontSize: 18,
            fontWeight: 'bold',
            color: WHITE,
          }}
        />
        <TextWidget
          text={formatTodayDate()}
          style={{
            fontSize: 12,
            color: 'rgba(255,255,255,0.85)',
            marginTop: 2,
          }}
        />
      </FlexWidget>

      {/* Events list */}
      {displayEvents.length === 0 ? (
        <NoEventsMessage />
      ) : (
        <ListWidget
          style={{
            flex: 1,
            width: 'match_parent',
          }}
        >
          {displayEvents.map((event, index) => (
            <EventRow
              key={`${event.name}-${index}`}
              event={event}
              isLast={index === displayEvents.length - 1 && !hasMore}
            />
          ))}
          {hasMore && (
            <FlexWidget
              style={{
                paddingHorizontal: 16,
                paddingVertical: 6,
              }}
              clickAction="OPEN_APP"
            >
              <TextWidget
                text={t('widget.moreEvents', { count: events.length - 5 })}
                style={{
                  fontSize: 12,
                  color: ACCENT_GOLD,
                  fontWeight: 'bold',
                }}
              />
            </FlexWidget>
          )}
        </ListWidget>
      )}

      {/* Footer */}
      <FlexWidget
        style={{
          width: 'match_parent',
          paddingHorizontal: 16,
          paddingVertical: 8,
          alignItems: 'center',
          borderTopWidth: 1,
          borderTopColor: '#e8e4d8',
        }}
        clickAction="OPEN_APP"
      >
        <TextWidget
          text={t('widget.open')}
          style={{
            fontSize: 12,
            fontWeight: 'bold',
            color: BRAND_GREEN_LIGHT,
          }}
        />
      </FlexWidget>
    </FlexWidget>
  );
}
