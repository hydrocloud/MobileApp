const assert = require("assert");

import React from "react";
import ReactDOM from "react-dom";
import { Card, Button, Textfield, ProgressBar, DataTable, TableHeader, List, ListItem, ListItemContent, ListItemAction, Icon } from "react-mdl";

import * as view from "./view.js";
import Verify from "./Verify.js";
import TextCanvas from "./TextCanvas.js";
import Chat from "./Chat.js";
import EventHub from "./EventHub.js";
const network = require("./network.js");
const user = require("./user.js");
const qq = require("./qq.js");

export default class JoinReview extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            requests: [],
            details: {}
        };
    }

    async updateList() {
        let r = await network.makeRequest("POST", "/api/admin/join_review/list");
        r = JSON.parse(r);
        if(r.err !== 0) throw r;

        let reqs = [];

        for(let req of r.requests) {
            reqs.push({
                id: req.id,
                userId: req.user_id,
                username: req.username,
                name: req.name,
                hasResponse: req.has_response,
                time: req.create_time
            });
        }

        this.setState({
            requests: reqs
        });
    }

    async toggleDetails(id) {
        if(this.state.details[id]) {
            delete this.state.details[id];
            this.setState(this.state);
            return;
        }

        let r = await network.makeRequest("POST", "/api/admin/join_review/details", {
            req_id: id
        });
        r = JSON.parse(r);
        if(r.err !== 0) throw r;

        this.state.details[id] = {
            userId: r.user_id,
            username: r.username,
            name: r.name,
            intro: r.intro,
            altContact: r.alt_contact,
            response: r.response,
            time: r.create_time
        };
        this.setState(this.state);
    }

    async sendResponse(id, resp) {
        let r = await network.makeRequest("POST", "/api/admin/join_review/respond", {
            req_id: id,
            response: resp
        });
        r = JSON.parse(r);
        if(r.err !== 0) throw r;

        EventHub.getDefault().fireEvent("notification", {
            content: "回复成功"
        });
        this.updateList();
    }

    pm(username) {
        Chat.preload({
            to: username
        });
        view.dispatch(Chat);
    }

    componentDidMount() {
        this.updateList();
    }

    addItemToReqList(list, req) {
        let details = this.state.details[req.id] || {};
        let hasDetails = Object.keys(details).length ? true : false;

        list.push(
            <ListItem key={req.id} style={{display: "block"}}>
                <ListItemContent>{req.name}</ListItemContent>
                <ListItemAction><a onClick={() => this.toggleDetails(req.id)}><Icon name={hasDetails ? "expand_less" : "expand_more"} /></a></ListItemAction>
            </ListItem>
        );
        list.push(
            <ListItem key={req.id + "_details"} style={{display: hasDetails ? "block" : "none"}}>
                <p><a onClick={() => this.pm(details.username)}>私信</a></p>
                <span>个人简介: </span><br /><pre>{details.intro}</pre>
                <p><span>备用联系方式: </span><span>{details.altContact}</span></p>
                <Textfield
                    onChange={ev => {
                        details.response = ev.target.value;
                        this.setState(this.state);
                    }}
                    label="回复"
                    floatingLabel
                    rows={7}
                    style={{width: "100%"}}
                    value={details.response}
                /><br />
                <a onClick={() => this.sendResponse(req.id, details.response)}><Icon name="done" /></a>
            </ListItem>
        );
    }

    render() {
        let pendingReqList = [];
        for(let req of this.state.requests.filter(v => !v.hasResponse)) {
            this.addItemToReqList(pendingReqList, req);
        }

        let doneReqList = [];
        for(let req of this.state.requests.filter(v => v.hasResponse)) {
            this.addItemToReqList(doneReqList, req);
        }

        return (
            <Card shadow={0} className="main-card">
                <h3>Join Review</h3>
                <h5>Pending</h5>
                <List>{pendingReqList}</List>
                <h5>Done</h5>
                <List>{doneReqList}</List>
            </Card>
        );
    }
}