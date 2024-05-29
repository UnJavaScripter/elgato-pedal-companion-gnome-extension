const { GObject, St, Gio, GLib } = imports.gi;
const ExtensionUtils = imports.misc.extensionUtils;
const Main = imports.ui.main;
const PanelMenu = imports.ui.panelMenu;
const PopupMenu = imports.ui.popupMenu;

const _ = ExtensionUtils.gettext;

const InterfaceInfo = Gio.DBusNodeInfo.new_for_xml(`
<!DOCTYPE node PUBLIC "-//freedesktop//DTD D-BUS Object Introspection 1.0//EN"
 "http://www.freedesktop.org/standards/dbus/1.0/introspect.dtd">
<node>
  <interface name="org.gnome.Shell.Extensions.Example">
    <method name="HelloWorld">
      <arg direction="in" type="s" name="name"/>
      <arg direction="out" type="s" name="response"/>
    </method>
    <signal name="ExampleSignal">
      <arg type="s" name="message"/>
    </signal>
  </interface>
</node>`);

let bus;
let registrationId;

const Indicator = GObject.registerClass(
    class Indicator extends PanelMenu.Button {
        _init() {
            super._init(0.0, _('Example Indicator'));

            this.add_child(new St.Icon({
                icon_name: 'face-smile-symbolic',
                style_class: 'system-status-icon',
            }));

            let item1 = new PopupMenu.PopupMenuItem(_('Show Notification'));
            item1.connect('activate', () => {
                Main.notify(_('Whatʼs up, folks?'));
            });

            let item2 = new PopupMenu.PopupMenuItem(_('Send D-Bus Message'));
            item2.connect('activate', () => {
                this._sendDbusMessage();
            });

            this.menu.addMenuItem(item1);
            this.menu.addMenuItem(item2);

            this._registerDbus();
        }

        _sendDbusMessage() {
            if (!bus) {
                logError(new Error('D-Bus connection not established'));
                return;
            }

            let message = `Hello at ${new Date().toLocaleTimeString()}`;
            log(`Emitting signal with message: ${message}`);
            bus.emit_signal(
                null,  // destination bus name, use null for the current connection
                '/org/gnome/shell/extensions/example', // object path
                'org.gnome.Shell.Extensions.Example',  // interface name
                'ExampleSignal',                       // signal name
                new GLib.Variant('(s)', [message])     // parameters
            );
        }

        _registerDbus() {
            log('Registering D-Bus object');
            Gio.bus_get(Gio.BusType.SESSION, null, (source, result) => {
                try {
                    bus = Gio.bus_get_finish(result);

                    registrationId = bus.register_object(
                        '/org/gnome/shell/extensions/example',
                        InterfaceInfo.interfaces[0],
                        (connection, sender, objectPath, interfaceName, methodName, parameters, invocation) => {
                            log(`Method call: ${methodName}`);
                            if (methodName === 'HelloWorld') {
                                let name = parameters.deep_unpack()[0];
                                invocation.return_value(new GLib.Variant('(s)', [`Hello, ${name}!`]));
                            }
                        },
                        (connection, sender, objectPath, interfaceName, propertyName) => {
                            console.log("🌟🌟🌟🌟🌟🌟🌟🌟🌟🌟🌟🌟🌟🌟🌟🌟🌟🌟🌟🌟🌟🌟")
                            console.log("🌟🌟🌟🌟🌟🌟🌟🌟🌟🌟🌟🌟🌟🌟🌟🌟🌟🌟🌟")
                            console.log(connection, sender, objectPath, interfaceName, propertyName)
                            console.log("🌟🌟🌟🌟🌟🌟🌟🌟🌟🌟🌟🌟🌟🌟🌟🌟🌟🌟🌟")
                            console.log("🌟🌟🌟🌟🌟🌟🌟🌟🌟🌟🌟🌟🌟🌟🌟🌟🌟🌟🌟🌟🌟🌟")
                        },
                        (connection, sender, objectPath, interfaceName, propertyName, value) => {
                            console.log("🌟🌟🌟🌟🌟🌟🌟🌟🌟🌟🌟🌟🌟🌟🌟🌟🌟🌟🌟🌟🌟🌟")
                            console.log("🌟🌟🌟🌟🌟🌟🌟🌟🌟🌟🌟🌟🌟🌟🌟🌟🌟🌟🌟")
                            console.log(connection, sender, objectPath, interfaceName, propertyName, value)
                            console.log("🌟🌟🌟🌟🌟🌟🌟🌟🌟🌟🌟🌟🌟🌟🌟🌟🌟🌟🌟")
                            console.log("🌟🌟🌟🌟🌟🌟🌟🌟🌟🌟🌟🌟🌟🌟🌟🌟🌟🌟🌟🌟🌟🌟")
                        }
                    );

                    log('D-Bus interface registered successfully');

                    bus.signal_subscribe(
                        null,
                        'org.gnome.Shell.Extensions.Example',
                        'ExampleSignal',
                        '/org/gnome/shell/extensions/example',
                        null,
                        Gio.DBusSignalFlags.NONE,
                        (connection, sender, objectPath, interfaceName, signalName, parameters) => {
                            let message = parameters.deep_unpack()[0];
                            log(`Received signal with message: ${message}`);
                            Main.notify('Received D-Bus Signal', message);
                        }
                    );
                } catch (e) {
                    logError(e);
                }
            });
        }

        destroy() {
            if (bus && registrationId) {
                bus.unregister_object(registrationId);
            }
            super.destroy();
        }
    }
);

class Extension {
    constructor(uuid) {
        this._uuid = uuid;
        ExtensionUtils.initTranslations('example');
    }

    enable() {
        this._indicator = new Indicator();
        Main.panel.addToStatusArea(this._uuid, this._indicator);
    }

    disable() {
        this._indicator.destroy();
        this._indicator = null;
    }
}

function init(meta) {
    return new Extension(meta.uuid);
}
