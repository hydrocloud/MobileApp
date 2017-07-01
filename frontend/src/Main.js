import React from "react";
import ReactDOM from "react-dom";
import { Layout, Header, Drawer, Navigation, Content, Grid, ProgressBar, Cell, Card, Button } from "react-mdl";

import * as view from "./view.js";
import * as network from "./network.js";
const config = require("./config.js");

export default class Main extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            "content": ""
        };
        view.registerMain(this);
    }

    onDispatch(TargetComponent) {
        this.setState({
            "content": ( <TargetComponent /> )
        });
    }

    async checkUpdate() {
        let r = await network.makeRequest("POST", "/api/update/latest_version");
        r = JSON.parse(r);
        if(r.version_code > config.VERSION_CODE) {
            alert("有新版本可用。\n" + r.version_description);
        }
    }

    componentDidMount() {
        this.checkUpdate();
    }

    render() {
        return (
            <div>
                <Layout fixedHeader>
                    <Header title={
                        <span style={{marginLeft: "-50px"}}>通中云平台</span>
                    } />
                    <Content>
                        <Grid>
                            <Cell col={12} align="middle" id="main-content">
                                {this.state.content}
                            </Cell>
                        </Grid>
                        <div id="copyright">
                            <span>版本 {config.VERSION_STR}</span><br />
                            <span>&copy; 2017 hydrocloud.net.</span><br />
                            <span>Licensed under GPL v3</span>
                        </div>
                    </Content>
                </Layout>
            </div>
        );
    }
}
