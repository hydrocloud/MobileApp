const assert = require("assert");

import React from "react";
import ReactDOM from "react-dom";
import { Card, Button, Textfield, ProgressBar, DataTable, TableHeader, List, ListItem } from "react-mdl";

import * as view from "./view.js";
import Verify from "./Verify.js";
import * as utils from "./utils.js";
import ClassNotificationView from "./ClassNotificationView.js";
import Article from "./Article.js";
const network = require("./network.js");
const user = require("./user.js");
const qq = require("./qq.js");

let preloaded = null;

export default class ArticleList extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            articles: []
        };
    }

    async updateArticleList() {
        let r = await network.makeRequest("POST", "/api/article/list");
        r = JSON.parse(r);
        if(r.err !== 0) throw r;

        this.setState({
            articles: r.articles.map(v => {
                return (
                    <ListItem key={v.id}><a onClick={() => this.showArticle(v.id)}>{v.title}</a></ListItem>
                );
            })
        });
    }

    async showArticle(id) {
        Article.preload(JSON.parse(await network.makeRequest("POST", "/api/article/get", {
            id: id
        })));
        view.dispatch(Article);
    }

    componentDidMount() {
        this.updateArticleList();
    }

    render() {
        return (
            <Card shadow={0} className="main-card">
                <h3>最近文章</h3>
                <List>
                    {this.state.articles}
                </List>
            </Card>

        )
    }
}
