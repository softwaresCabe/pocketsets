package com.pocketsets.app

import android.appwidget.AppWidgetManager
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin

@CapacitorPlugin(name = "WidgetData")
class WidgetDataPlugin : Plugin() {

    @PluginMethod
    fun updateWidgetData(call: PluginCall) {
        val data = call.getObject("data") ?: run {
            call.reject("Missing 'data' parameter")
            return
        }

        val prefs = context.getSharedPreferences("pocketsets_widget", Context.MODE_PRIVATE)
        prefs.edit().putString("json", data.toString()).apply()

        // Trigger a redraw for all active widget instances
        val manager = AppWidgetManager.getInstance(context)
        val component = ComponentName(context, PocketSetsWidget::class.java)
        val ids = manager.getAppWidgetIds(component)
        if (ids.isNotEmpty()) {
            val intent = Intent(context, PocketSetsWidget::class.java).apply {
                action = AppWidgetManager.ACTION_APPWIDGET_UPDATE
                putExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS, ids)
            }
            context.sendBroadcast(intent)
        }

        call.resolve()
    }
}
