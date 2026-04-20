package com.pocketsets.app

import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.widget.RemoteViews
import org.json.JSONObject

class PocketSetsWidget : AppWidgetProvider() {

    override fun onUpdate(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetIds: IntArray
    ) {
        for (id in appWidgetIds) {
            updateWidget(context, appWidgetManager, id)
        }
    }

    companion object {
        fun updateWidget(context: Context, manager: AppWidgetManager, widgetId: Int) {
            val views = RemoteViews(context.packageName, R.layout.widget_pocketsets)
            val prefs = context.getSharedPreferences("pocketsets_widget", Context.MODE_PRIVATE)
            val json = prefs.getString("json", null)

            if (json != null) {
                try {
                    val data = JSONObject(json)

                    // Primary card: next favorite or recommendation
                    when {
                        !data.isNull("nextFavorite") -> {
                            val next = data.getJSONObject("nextFavorite")
                            views.setTextViewText(R.id.widget_primary_label, "NEXT UP")
                            views.setTextViewText(R.id.widget_primary_artist, next.getString("artistName"))
                            views.setTextViewText(R.id.widget_primary_stage, next.getString("stageName"))
                            views.setTextViewText(R.id.widget_primary_time, next.optString("startTimeLabel", ""))
                        }
                        !data.isNull("recommendation") -> {
                            val rec = data.getJSONObject("recommendation")
                            views.setTextViewText(R.id.widget_primary_label, "CHECK OUT")
                            views.setTextViewText(R.id.widget_primary_artist, rec.getString("artistName"))
                            views.setTextViewText(R.id.widget_primary_stage, rec.getString("stageName"))
                            views.setTextViewText(R.id.widget_primary_time, rec.optString("startTimeLabel", ""))
                        }
                        else -> {
                            views.setTextViewText(R.id.widget_primary_label, "EDC LAS VEGAS 2026")
                            views.setTextViewText(R.id.widget_primary_artist, "PocketSets")
                            views.setTextViewText(R.id.widget_primary_stage, "May 15–17")
                            views.setTextViewText(R.id.widget_primary_time, "Open the app to get started")
                        }
                    }

                    // Now playing summary
                    val nowPlaying = data.getJSONArray("nowPlaying")
                    if (nowPlaying.length() > 0) {
                        val first = nowPlaying.getJSONObject(0)
                        views.setTextViewText(R.id.widget_live_label, "LIVE NOW · ${nowPlaying.length()} STAGE${if (nowPlaying.length() != 1) "S" else ""}")
                        views.setTextViewText(R.id.widget_live_artist, first.getString("artistName"))
                        views.setTextViewText(R.id.widget_live_stage, first.getString("stageName"))
                    } else {
                        views.setTextViewText(R.id.widget_live_label, "LIVE NOW")
                        views.setTextViewText(R.id.widget_live_artist, "Nothing playing yet")
                        views.setTextViewText(R.id.widget_live_stage, "")
                    }
                } catch (_: Exception) {
                    setFallback(views)
                }
            } else {
                setFallback(views)
            }

            manager.updateAppWidget(widgetId, views)
        }

        private fun setFallback(views: RemoteViews) {
            views.setTextViewText(R.id.widget_primary_label, "EDC LAS VEGAS 2026")
            views.setTextViewText(R.id.widget_primary_artist, "PocketSets")
            views.setTextViewText(R.id.widget_primary_stage, "May 15–17")
            views.setTextViewText(R.id.widget_primary_time, "Open the app to get started")
            views.setTextViewText(R.id.widget_live_label, "LIVE NOW")
            views.setTextViewText(R.id.widget_live_artist, "")
            views.setTextViewText(R.id.widget_live_stage, "")
        }
    }
}
