const { GObject, St, Gio, GLib } = imports.gi;
const ExtensionUtils = imports.misc.extensionUtils;
const Main = imports.ui.main;
const PanelMenu = imports.ui.panelMenu;
const PopupMenu = imports.ui.popupMenu;

const _ = ExtensionUtils.gettext;

BUS_NAME = 'org.gnome.shell.extensions.Unjs'
OBJECT_PATH = '/org/gnome/shell/extensions/unjs'
SIGNAL_NAME = 'ExampleSignal'

const interfaceXml = `
<node>
    <interface name="${BUS_NAME}">
        <method name="HelloWorld">
            <arg type="s" name="name" direction="in"/>
            <arg type="s" name="response" direction="out"/>
        </method>
        <signal name="${SIGNAL_NAME}">
            <arg type="s" name="message"/>
        </signal>
    </interface>
</node>
`

let bus;
let registrationId;

let serviceInstance = null;
let exportedObject = null;
let signalName = null;
let busNameOwnId = null;

class Service {
    signals = {}
    session = null
    glibVariant = null
    dbusSignalFlags = null

    constructor(session, glibVariant, dbusSignalFlags) {
        this.session = session
        this.glibVariant = glibVariant
        this.dbusSignalFlags = dbusSignalFlags
    }
    
    // Properties
    get ReadOnlyProperty() {
        return this.glibVariant.new_string('a string');
    }

    get ReadWriteProperty() {
        if (this._readWriteProperty === undefined)
            return false;

        return this._readWriteProperty;
    }

    set ReadWriteProperty(value) {
        if (this._readWriteProperty === value)
            return;

        this._readWriteProperty = value;
        this._impl.emit_property_changed('ReadWriteProperty',
            this.glibVariant.new_boolean(this.ReadWriteProperty));
    }

    // Methods
    SimpleMethod() {
        console.log('SimpleMethod() invoked');
    }

    ComplexMethod(input) {
        console.log(`ComplexMethod() invoked with '${input}'`);

        return input.length;
    }

    // Signals
    getSignalId(signalName) {
        return this.signals[signalName]
    }

    clearSignalId(signalName) {
        delete this.signals[signalName]
    }

    emitTestSignal(signalName, message) {
        log(`Emitting signal ${signalName} with message: ${message}`);
        this._impl.emit_signal(signalName,
            new this.glibVariant('(s)', [message]));
    }

    signalSubscribe(signalName, onSignalCallback) {

        this.signals[signalName] = this.session.signal_subscribe(
            null,
            BUS_NAME,
            signalName,
            OBJECT_PATH,
            null,
            this.dbusSignalFlags.NONE,
            onSignalCallback
        );
        console.log("🌟🌟🌟🌟🌟🌟🌟🌟🌟🌟🌟🌟🌟🌟🌟🌟🌟🌟🌟🌟🌟🌟")
        console.log("🌟🌟🌟🌟🌟🌟🌟🌟🌟🌟🌟🌟🌟🌟🌟🌟🌟🌟🌟")
        console.log(this.signals[signalName])
        console.log("🌟🌟🌟🌟🌟🌟🌟🌟🌟🌟🌟🌟🌟🌟🌟🌟🌟🌟🌟")
        console.log("🌟🌟🌟🌟🌟🌟🌟🌟🌟🌟🌟🌟🌟🌟🌟🌟🌟🌟🌟🌟🌟🌟")
    }
}

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

        _registerDbus() {
            log('Registering D-Bus object');
            Gio.bus_get(Gio.BusType.SESSION, null, (source, result) => {
                try {
                    bus = Gio.bus_get_finish(result);

                    if (busNameOwnId) {
                        Gio.bus_unown_name(busNameOwnId);
                    }

                    busNameOwnId = Gio.bus_own_name(
                        Gio.BusType.SESSION,
                        BUS_NAME,
                        Gio.BusNameOwnerFlags.NONE,
                        // onBusAcquired
                        (connection, _name) => {
                            // Another method to get the connection: const connection = Gio.DBus.session;
                            log(`Successfully acquired bus name: ${BUS_NAME}`);
                            console.log(">>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>")
                            console.log(connection, _name)
                            console.log("<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<")
                            serviceInstance = new Service(Gio.DBus.session, GLib.Variant, Gio.DBusSignalFlags);
                            exportedObject = Gio.DBusExportedObject.wrapJSObject(interfaceXml,
                                serviceInstance);
                        
                            // Assign the exported object to the property the class expects, then export
                            serviceInstance._impl = exportedObject;
                            exportedObject.export(connection, OBJECT_PATH);
                        },
                        // onNameAcquired
                        (name) => {
                            log(`Name acquired: ${name}`);
                            serviceInstance.signalSubscribe(SIGNAL_NAME, this._onSignalCallback)
                            // Gio.DBus.session.signal_subscribe(
                            //     null,
                            //     BUS_NAME,
                            //     signalName,
                            //     OBJECT_PATH,
                            //     null,
                            //     this.dbusSignalFlags.NONE,
                            //     this._onSignalCallback
                            // );
                        },
                        // onNameLost
                        (error) => {
                            logError(`Error acquiring bus name: ${error}`);
                        });
                    


                    // registrationId = bus.register_object(
                    //     OBJECT_PATH,
                    //     Gio.DBusNodeInfo.new_for_xml(interfaceXml).interfaces[0],
                    //     (connection, sender, objectPath, interfaceName, methodName, parameters, invocation) => {
                    //         console.log("🌟🌟🌟🌟🌟🌟🌟🌟🌟🌟🌟🌟🌟🌟🌟🌟🌟🌟🌟🌟🌟🌟")
                    //         console.log("🌟🌟🌟🌟🌟🌟🌟🌟🌟🌟🌟🌟🌟🌟🌟🌟🌟🌟🌟")
                    //         console.log(interfaceName)
                    //         console.log("🌟🌟🌟🌟🌟🌟🌟🌟🌟🌟🌟🌟🌟🌟🌟🌟🌟🌟🌟")
                    //         console.log("🌟🌟🌟🌟🌟🌟🌟🌟🌟🌟🌟🌟🌟🌟🌟🌟🌟🌟🌟🌟🌟🌟")
                    //         log(`Method call: ${methodName}`);
                    //         if (methodName === 'HelloWorld') {
                    //             let name = parameters.deep_unpack()[0];
                    //             invocation.return_value(new GLib.Variant('(s)', [`Hello, ${name}!`]));
                    //         }
                    //     },
                    //     null,
                    //     null
                    // );

                    log('D-Bus interface registered successfully');

                    // busNameOwnId = Gio.bus_own_name(
                    //     Gio.BusType.SESSION,
                    //     BUS_NAME,
                    //     Gio.BusNameOwnerFlags.NONE,
                    //     (connection, name) => {
                    //         console.log(`${name}: connection acquired`);
                    //     },
                    //     (connection, name) => {
                    //         console.log(`${name}: name acquired`);
                    //     },
                    //     (connection, name) => {
                    //         console.log(`${name}: name lost`);
                    //     }
                    // );
                    

                    // signalName = bus.signal_subscribe(
                    //     null,
                    //     BUS_NAME,
                    //     SIGNAL_NAME,
                    //     OBJECT_PATH,
                    //     null,
                    //     Gio.DBusSignalFlags.NONE,
                    //     (connection, sender, objectPath, interfaceName, signalName, parameters) => {
                    //         let message = parameters.deep_unpack()[0];
                    //         log(`Received signal with message: ${message}`);
                    //         Main.notify('Received D-Bus Signal!', message);
                    //     }
                    // );
                    
                } catch (e) {
                    console.log(">>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>")
                    console.log("poop💩💩💩💩💩💩💩💩💩💩💩💩💩💩💩💩💩💩💩💩💩💩💩💩💩💩💩💩💩💩💩💩")
                    console.log("<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<")
                    logError(e);
                }
            });
        }

        _onSignalCallback(connection, sender, objectPath, interfaceName, signalName, parameters) {
            console.log(">>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>")
            console.log("_onSignalCallback 🎏🎏🎏🎏🎏🎏🎏🎏🎏🎏🎏🎏🎏🎏🎏🎏🎏🎏🎏🎏🎏")
            console.log(connection, sender, objectPath, interfaceName, signalName,);
            console.log("🎏🎏🎏🎏🎏🎏🎏🎏🎏🎏🎏🎏🎏🎏🎏🎏🎏🎏🎏🎏🎏")
            console.log("<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<")
            let message = parameters.deep_unpack()[0];
            log(`Received signal using a service: ${message}`);
            Main.notify('Signal!', message);
        }

        _sendDbusMessage() {
            if (!bus) {
                logError(new Error('D-Bus connection not established'));
                return;
            }

            let message = `Olis! at ${new Date().toLocaleTimeString()}`;
            // bus.emit_signal(
            //     null,
            //     OBJECT_PATH,
            //     BUS_NAME,
            //     SIGNAL_NAME,
            //     new GLib.Variant('(s)', [message])
            // );
            serviceInstance.emitTestSignal(SIGNAL_NAME, message)
        }

        destroy() {
            if (bus && registrationId) {
                bus.unregister_object(registrationId);
                registrationId = null;
            }

            if (bus && serviceInstance) {
                if (serviceInstance.getSignalId(SIGNAL_NAME)) {
                    serviceInstance.session.signal_unsubscribe(serviceInstance.getSignalId(SIGNAL_NAME))
                    serviceInstance.clearSignalId(SIGNAL_NAME)
                    serviceInstance = null;
                }
            }

            if (busNameOwnId) {
                Gio.bus_unown_name(busNameOwnId);
                busNameOwnId = null
            }
            exportedObject = null
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
