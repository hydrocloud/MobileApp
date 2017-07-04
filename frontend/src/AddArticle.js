const assert = require("assert");

import React from "react";
import ReactDOM from "react-dom";
import { Card, Button, Textfield, ProgressBar, DataTable, TableHeader } from "react-mdl";

import * as view from "./view.js";
import Verify from "./Verify.js";
import * as utils from "./utils.js";
import ClassNotificationView from "./ClassNotificationView.js";
const network = require("./network.js");
const user = require("./user.js");
const qq = require("./qq.js");

export default class AddArticle extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            blogArticleId: "",
            adding: false
        };
    }

    async addArticle() {
        if(!this.state.blogArticleId) {
            alert("请填写博客文章 ID");
            return;
        }
        this.setState({
            adding: true
        });
        let r = await network.makeRequest("POST", "/api/admin/article/add", {
            blog_article_id: this.state.blogArticleId
        });
        this.setState({
            adding: false
        });
        r = JSON.parse(r);
        if(r.err !== 0) {
            alert("添加失败: " + r.msg);
            console.log(r);
            return;
        }
        alert("添加成功。文章 ID: " + r.article_id);
        this.setState({
            blogArticleId: ""
        });
    }

    render() {
        return (
            <Card shadow={0} className="main-card">
                <h3>添加文章</h3>
                <div style={{display: this.state.adding ? "none" : "block"}}>
                    <Textfield
                        onChange={ev => this.setState({ blogArticleId: ev.target.value })}
                        label="博客文章 ID"
                        style={{width: "100%", marginTop: 0}}
                        value={this.state.blogArticleId}
                    /><br />
                    <Button raised colored onClick={() => this.addArticle()}>确认添加</Button>
                </div>
                <ProgressBar indeterminate style={{display: this.state.adding ? "block" : "none"}} />
            </Card>
        )
    }
}
