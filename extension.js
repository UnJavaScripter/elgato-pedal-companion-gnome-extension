const { GObject, St, Gio, GLib, Clutter } = imports.gi;
const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
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
        // console.log(this.signals[signalName])
    }
}

const icons_list = ['media-playback-start', 'microphone-sensitivity-medium-symbolic', 'media-skip-backward-symbolic']

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

function getRandomState() {
    const states = ["pressed", "held", "released"];
    return states[Math.floor(Math.random() * states.length)]
}

// Function to build the object with the selected icons
function buildObj(list) {
    return new Map([
        ["k1", { "icon": list[0], "state": getRandomState() }],
        ["k2", { "icon": list[1], "state": getRandomState() }],
        ["k3", { "icon": list[2], "state": getRandomState() }]
    ])
    
}

const Indicator = GObject.registerClass(
    class Indicator extends PanelMenu.Button {
        _init() {
            super._init(0.0, _('Example Indicator'));
            this.style_class = "pedal-companion-widget--container"
            this.box = new St.BoxLayout({
                style_class: 'pedal-companion-widget--box'
            });
            this.add_child(this.box);
            this.keyIndicatorsMap = new Map()
            
            // Add initial key indicators
            const randomIcons = getRandomElementsFromList(icons_list, 3);
            this._updateKeyIndicators(buildObj(randomIcons))

            this._registerDbus();

            let item1 = new PopupMenu.PopupMenuItem(_('Show Notification'));
            item1.connect('activate', () => {
                Main.notify(_('Whatʼs up, folks?'));
            });

            let item2 = new PopupMenu.PopupMenuItem(_('Send D-Bus Message'));
            item2.connect('activate', () => {
                const randomIcons = getRandomElementsFromList(icons_list, 3);
                const message = {"--x-elgato-pedal-companion-notification": Array.from(buildObj(randomIcons))}
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
                icon_name: keyIndicatorObj.icon,
                style_class: iconClasses,
                name: keyIndicatorObj.name,
                accessible_name: keyIndicatorObj.name,
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
                            serviceInstance.signalSubscribe(SIGNAL_NAME, this._onSignalCallback.bind(this))
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

        _onSignalCallback(connection, sender, objectPath, interfaceName, signalName, parameters) {
            console.log(">>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>")
            console.log("_onSignalCallback 🎏🎏🎏🎏🎏🎏🎏🎏🎏🎏🎏🎏🎏🎏🎏🎏🎏🎏🎏🎏🎏")
            console.log(connection, sender, objectPath, interfaceName, signalName,);
            console.log("🎏🎏🎏🎏🎏🎏🎏🎏🎏🎏🎏🎏🎏🎏🎏🎏🎏🎏🎏🎏🎏")
            console.log("<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<")
            let message = parameters.deep_unpack()[0];
            log(`Received signal with message: ${message}`);
            Main.notify('Received D-Bus Signal', message);
            
            // Update icons based on the message
            const expectedMessagePropertyContainer = "--x-elgato-pedal-companion-notification"
            let newIconsObj;
            try {
                newIconsObj = JSON.parse(message);
                try {
                    if (newIconsObj[expectedMessagePropertyContainer]) {
                        const iconsObjArr = newIconsObj[expectedMessagePropertyContainer]
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
