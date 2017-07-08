const assert = require("assert");

import React from "react";
import ReactDOM from "react-dom";
import { Card, Button, Textfield, ProgressBar, DataTable, TableHeader } from "react-mdl";

import * as view from "./view.js";
import Verify from "./Verify.js";
import * as utils from "./utils.js";
import ThirdPartyCard from "./ThirdPartyCard.js";
import EmptyNotice from "./EmptyNotice.js";
const network = require("./network.js");
const user = require("./user.js");

export default class ThirdPartyCards extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            cards: []
        };
    }

    async updateCards() {
        let cards = await network.makeRequest("POST", "/api/user/third_party_card/get_all");
        cards = JSON.parse(cards);
        if(cards.err !== 0) {
            alert("获取第三方卡片失败。");
            console.log(cards);
            return;
        }
        cards = cards.cards;

        this.setState({
            cards: cards.map(c => (<ThirdPartyCard key={c.id} description={c} />))
        });
    }

    componentDidMount() {
        this.updateCards();
    }

    render() {
        if(!this.state.cards.length) {
            return <div><EmptyNotice text="你还没有添加任何小工具" /></div>;
        }
        return <div>{this.state.cards}</div>
    }
}