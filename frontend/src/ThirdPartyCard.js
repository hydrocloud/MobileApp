const assert = require("assert");

import React from "react";
import ReactDOM from "react-dom";
import { Card, Button, Textfield, ProgressBar, DataTable, TableHeader } from "react-mdl";

import * as view from "./view.js";
import Verify from "./Verify.js";
import * as utils from "./utils.js";
const network = require("./network.js");
const user = require("./user.js");

export default class ThirdPartyCard extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            card: "",
            scriptCode: "",
            textFields: {}
        };
    }

    executeScript(code, params) {
        return new Promise((cb, reject) => {
            console.log(code);
            console.log(params);

            let targetCode = "window.executeParams = " + JSON.stringify(params) + ";\n" + code;

            if(!window.cordova || !window.cordova.InAppBrowser) {
                if(window.unsafeScriptExec) {
                    console.log("Warning: Executing unsafe script without sandbox.");
                    let ret;
                    try {
                        ret = eval(targetCode);
                    } catch(e) {
                        console.log(e);
                        ret = null;
                    }
                    cb(ret);
                } else {
                    reject("无法加载沙箱环境。拒绝执行脚本。请设置 window.unsafeScriptExec = true 来允许不安全的脚本执行。");
                }
            }

            let iab = cordova.InAppBrowser.open("about:blank", "_blank", "location=no,hidden=yes");
            iab.addEventListener("loadstop", () => {
                let closed = false;
                const timeout = 2000;
                
                setTimeout(() => {
                    if(closed) return;

                    closed = true;
                    iab.close();
                    console.log("Execution timeout (" + timeout + " ms)");
                    cb(null);
                }, timeout);

                iab.executeScript({
                    code: targetCode
                }, ret => {
                    if(closed) return;

                    closed = true;
                    iab.close();
                    console.log(ret);
                    cb(ret[0]);
                });
            });
        });
    }

    parseElements(elems) {
        let ret = [];
        let nextId = 0;

        for(let elem of elems) {
            if(typeof(elem) == "string" || typeof(elem) == "number") {
                ret.push("" + elem);
                continue;
            }

            let type = elem.type;
            switch(type) {
                case "div":
                    ret.push(<div key={"" + (nextId++)}>{this.parseElements(elem.children)}</div>);
                    break;

                case "p":
                    ret.push(<p key={"" + (nextId++)}>{this.parseElements(elem.children)}</p>);
                    break;
                
                case "h5":
                    ret.push(<h5 key={"" + (nextId++)}>{this.parseElements(elem.children)}</h5>);
                    break;
                
                case "br":
                    ret.push(<br />);
                    break;
                
                case "table": {
                    let headers = elem.headers.map((v, index) => (<TableHeader name={"" + index} key={"" + index}>{v}</TableHeader>));
                    let rows = elem.rows.map(v => {
                        let ret = {};
                        for(let i = 0; i < v.length; i++) {
                            ret["" + i] = "" + v[i];
                        }
                        return ret;
                    });

                    ret.push(<DataTable
                        key={"" + (nextId++)}
                        shadow={0}
                        rows={rows}
                        style={{width: "100%"}}
                    >
                        {headers}
                    </DataTable>);
                    break;
                }

                case "text_input": {
                    let name = elem.name;
                    let label = elem.label || "";
                    let disabled = elem.disabled || false;

                    if(!name) {
                        throw new Error("A name is needed for text_input");
                    }

                    if(!this.state.textFields[name]) this.state.textFields[name] = "";
                    this.setState({
                        textFields: this.state.textFields
                    });

                    let onChange = ev => {
                        this.state.textFields[name] = ev.target.value;
                        this.setState({
                            textFields: this.state.textFields
                        });
                        this.updateCard();
                    };

                    ret.push(<div key={"" + (nextId++)}>
                        <Textfield
                            label={label}
                            floatingLabel
                            disabled={disabled}
                            onChange={onChange}
                            value={this.state.textFields[name]}
                            style={{width: "100%"}}
                        /><br />
                    </div>);
                    break;
                }

                case "button": {
                    let name = elem.name || "";
                    let label = elem.label || "";

                    let onClick = async ev => {
                        let r;
                        try {
                            r = await this.executeScript(this.state.scriptCode, {
                                event: "click",
                                target: name,
                                textFields: this.state.textFields
                            });
                            console.log(r);
                        } catch(e) {
                            alert("执行失败");
                            console.log(e);
                            return;
                        }

                        if(r) {
                            if(r.set && typeof(r.set) == "object") {
                                if(r.set.textFields && typeof(r.set.textFields) == "object") {
                                    for(let k in r.set.textFields) {
                                        this.state.textFields[k] = r.set.textFields[k];
                                    }
                                    this.setState({
                                        textFields: this.state.textFields
                                    });
                                }
                            }
                        }
                        this.updateCard();
                    };
                    ret.push(<Button raised colored key={"" + (nextId++)} onClick={onClick}>{label}</Button>);
                    break;
                }

                default:
                    throw new Error("Unknown element type: " + type);
            }
        }
        return ret;
    }

    async removeCard(card) {
        if(!confirm("你正在移除由服务 " + card.service_name + " 提供的卡片 " + card.title + " 。请再次确认。")) {
            return;
        }

        await network.makeRequest("POST", "/api/user/third_party_card/remove", {
            card_id: card.id
        });
        this.setState({
            card: ""
        });
    }

    updateCard() {
        let c = this.props.description;
        if(!c) throw new Error("Card description required");

        this.setState({
            scriptCode: c.script_code
        });

        let tree;
        try {
            tree = this.parseElements(c.elements);
        } catch(e) {
            console.log(e);
            return;
        }

        this.setState({
            card: (
                <Card key={c.id} shadow={0} className="main-card">
                    <h3>{c.title}</h3>
                    <p style={{color: "#7F7F7F", fontSize: "14px", lineHeight: "22px"}}>
                        <span>由服务 <strong>{c.service_name}</strong> 提供</span><br />
                        <span>更新于 {utils.getRelativeTime(c.create_time)}</span><br />
                        <a onClick={() => this.removeCard(c)}>移除</a>
                    </p>
                    {tree}
                </Card>
            )
        });
    }

    componentDidMount() {
        this.updateCard();
    }

    render() {
        return <div>{this.state.card}</div>
    }
}