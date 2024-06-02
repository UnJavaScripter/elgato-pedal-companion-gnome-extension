const { GObject, St, Gio, GLib, Clutter } = imports.gi;
const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const Main = imports.ui.main;
const PanelMenu = imports.ui.panelMenu;
const PopupMenu = imports.ui.popupMenu;
const _ = ExtensionUtils.gettext;

BUS_NAME = 'org.gnome.shell.extensions.Elgatopedalcompanion'
OBJECT_PATH = '/org/gnome/shell/extensions/elgatopedalcompanion'
SIGNAL_NAME = 'PedalActionSignal'

const interfaceXml = `
<node>
    <interface name="${BUS_NAME}">
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
    }
}

const icon_button_mapping = {
    "Button1": "media-playback-start",
    "Button2": "microphone-sensitivity-medium-symbolic",
    "Button3": "media-skip-forward-symbolic"
}

function getRandomElementsFromList(inputList, n) {
    if (inputList.length < n) {
        throw new Error("Input list must contain at least 3 elements");
    }

    let shuffled = inputList.slice(0), i = inputList.length, min = i - n, temp, index;
    while (i-- > min) {
        index = Math.floor((i + 1) * Math.random());
        temp = shuffled[index];
        shuffled[index] = shuffled[i];
        shuffled[i] = temp;
    }
    return shuffled.slice(min);
}

// Function to build the object with the selected icons
function buildObj(press_one) {
    return new Map([
        ["Button1", { "name": "Button1", "icon": icon_button_mapping["Button1"], "state": "released", "action": "idle" }],
        ["Button2", { "name": "Button2", "icon": icon_button_mapping["Button2"], "state": press_one ? "pressed" : "released", "action": "idle" }],
        ["Button3", { "name": "Button3", "icon": icon_button_mapping["Button3"], "state": "released", "action": "idle" }]
    ])
    
}

const Indicator = GObject.registerClass(
    class Indicator extends PanelMenu.Button {
        _init() {
            super._init(0.0, _('Elgato pedal companion indicator'));
            this.style_class = "pedal-companion-widget--container"
            this.box = new St.BoxLayout({
                style_class: 'pedal-companion-widget--box'
            });
            this.add_child(this.box);
            this.keyIndicatorsMap = new Map()
            
            // Add initial key indicators

            this._updateKeyIndicators(buildObj())

            this._registerDbus();

            let item1 = new PopupMenu.PopupMenuItem(_('Show Notification'));
            item1.connect('activate', () => {
                Main.notify(_('Whatʼs up, folks?'));
            });

            let item2 = new PopupMenu.PopupMenuItem(_('Send D-Bus Message'));
            item2.connect('activate', () => {
                const message = {"--x-elgato-pedal-companion-notification": Array.from(buildObj(true))}
                this._sendDbusMessage(JSON.stringify(message));
            });

            this.menu.addMenuItem(item1);
            this.menu.addMenuItem(item2);
        }

        _displayKeyIndicator(keyIndicatorObj) {
            let iconClasses = "pedal-companion-widget--icon"
            if (keyIndicatorObj.state) {
                iconClasses += ` pedal-companion-widget--icon__${keyIndicatorObj.state}`
            } 

            let icon = new St.Icon({
                icon_name: icon_button_mapping[keyIndicatorObj.name],
                style_class: iconClasses,
                name: keyIndicatorObj.action,
                accessible_name: keyIndicatorObj.action,
                icon_size: 18
            });
            this.box.add_child(icon);
        }

        _updateKeyIndicators(newKeyIndicatorsMap) {
            if (this.keyIndicatorsMap.size) {
                this.box.destroy_all_children()
            }
            this.keyIndicatorsMap = new Map([...this.keyIndicatorsMap, ...newKeyIndicatorsMap])
            this.keyIndicatorsMap.forEach((keyIndicatorObj, name) => {
                this._displayKeyIndicator({name, ...keyIndicatorObj});
            });
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
                            serviceInstance.signalSubscribe(SIGNAL_NAME, (connection, sender, objectPath, interfaceName, signalName, parameters) => {
                                console.log(parameters.deep_unpack());
                                const message = parameters.deep_unpack()[0];
                                const expectedMessagePropertyContainer = "--x-elgato-pedal-companion-notification"
                    
                                let pedalActionsObj;
                                try {
                                    pedalActionsObj = JSON.parse(message);
          
                                    log(`name: ${pedalActionsObj[expectedMessagePropertyContainer][0]}`);
                    
                    
                                    try {
                                        if (pedalActionsObj[expectedMessagePropertyContainer]) {
                                            const iconsObjArr = pedalActionsObj[expectedMessagePropertyContainer]
                                            if (iconsObjArr.length) {
                                                this._updateKeyIndicators(new Map(iconsObjArr));
                                            } else {
                                                throw new Error("Empty icons object array.")
                                            }
                                        } else {
                                            console.error("the expected property DOES NOT exist", expectedMessagePropertyContainer);
                                            throw new Error("Signature property not found. Looking for property named", expectedMessagePropertyContainer)
                                        }
                                    } catch ({name, error}) {
                                        console.error(`Failed to process messagee. ${name}: ${error}`);
                                    }
                                } catch (error) {
                                    console.error("Error parsing message to JSON.")
                                }
                            })
                        },
                        // onNameLost
                        (error) => {
                            logError(`Error acquiring bus name: ${error}`);
                        });

                    log('D-Bus interface registered successfully');
                    
                } catch (e) {
                    logError(e);
                }
            });
        }

        _sendDbusMessage(message) {
            if (!bus) {
                logError(new Error('D-Bus connection not established'));
                return;
            }
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
        exportedObject = null
    }
}

function init(meta) {
    return new Extension(meta.uuid);
}
