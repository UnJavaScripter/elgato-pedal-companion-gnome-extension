/* prefs.js
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 2 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 *
 * SPDX-License-Identifier: GPL-2.0-or-later
 */

const { Gtk, Gio } = imports.gi;
const ExtensionUtils = imports.misc.extensionUtils;
const Gettext = imports.gettext;
const Me = ExtensionUtils.getCurrentExtension();

Gettext.bindtextdomain(Me.metadata.uuid, Me.dir.get_child('locale').get_path());
const _ = Gettext.domain(Me.metadata.uuid).gettext;

function init() {
}

function buildPrefsWidget() {
    const settings = ExtensionUtils.getSettings('unjs.testy.appita');

    const widget = new Gtk.Box({
        orientation: Gtk.Orientation.VERTICAL,
        spacing: 10,
        margin_top: 20,
        margin_bottom: 20,
        margin_start: 20,
        margin_end: 20,
    });

    const title = new Gtk.Label({
        label: '<b>' + _('Example Extension Preferences') + '</b>',
        use_markup: true,
        halign: Gtk.Align.START,
    });
    widget.append(title);

    const switchLabel = new Gtk.Label({
        label: _('Enable Feature:'),
        halign: Gtk.Align.START,
    });
    widget.append(switchLabel);

    const switchButton = new Gtk.Switch({
        active: settings.get_boolean('enable-feature'),
        halign: Gtk.Align.END,
    });
    settings.bind('enable-feature', switchButton, 'active', Gio.SettingsBindFlags.DEFAULT);
    widget.append(switchButton);

    return widget;
}
